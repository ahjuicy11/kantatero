import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteQueueItem,
  fetchQueue,
  insertQueueItem,
  rowToSong,
  seenQueueIds,
  sendCommand,
  updateQueuePosition,
  type PlayerCommandRow,
  type QueueItemRow,
} from "@/lib/room-client";
import { useKaraoke, type QueueItem } from "@/stores/karaoke-store";

/**
 * Runs on the TV/PC screen. Given the hosted room id:
 * - Ingests queue items reserved from phones into the local queue.
 * - Mirrors local queue changes (add/remove/reorder) back to the DB so all
 *   paired phones see the same list in realtime.
 * - Dispatches remote playback commands via window events.
 * - Broadcasts current now-playing to paired remotes.
 */
export function useRoomHost(roomId: string | null) {
  const [queue, setQueue] = useState<QueueItemRow[]>([]);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;

    // Map local queueId <-> DB row id so we know which local items already
    // have a mirror row and can delete/reorder them without dupes.
    const localToDb = new Map<string, string>();
    const dbToLocal = new Map<string, string>();

    const link = (queueId: string, dbId: string) => {
      localToDb.set(queueId, dbId);
      dbToLocal.set(dbId, queueId);
      seenQueueIds.add(dbId);
    };
    const unlink = (queueId: string) => {
      const dbId = localToDb.get(queueId);
      if (dbId) {
        localToDb.delete(queueId);
        dbToLocal.delete(dbId);
      }
      return dbId;
    };

    /** Ingest a DB row into the local queue and remember the mapping. */
    // Bumped while we mutate the local store from an inbound DB row so the
    // store subscriber below doesn't turn around and re-insert it.
    let ingesting = 0;
    const ingestRow = (r: QueueItemRow) => {
      if (dbToLocal.has(r.id)) return; // already mirrored
      seenQueueIds.add(r.id);
      const before = useKaraoke.getState().queue.length;
      ingesting++;
      try {
        useKaraoke.getState().reserve(rowToSong(r), r.reserved_by ?? "Guest");
      } finally {
        ingesting--;
      }
      const after = useKaraoke.getState().queue;
      const added = after[before]; // reserve() appends at end
      if (added) {
        link(added.queueId, r.id);
      } else {
        // Blocked by per-guest limit — drop the stray DB row so phones stay in sync.
        deleteQueueItem(r.id).catch(() => {});
        setQueue((q) => q.filter((x) => x.id !== r.id));
      }
    };


    // ---- Initial fetch ----
    fetchQueue(roomId).then((rows) => {
      if (cancelled) return;
      setQueue(rows);
      // Try to match rows to any items already in the local store (e.g. from
      // persisted state) by video_id + reserved_by; ingest the rest.
      const local = useKaraoke.getState().queue;
      const usedLocal = new Set<string>();
      const unmatched: QueueItemRow[] = [];
      for (const r of rows) {
        if (r.status !== "pending") continue;
        const match = local.find(
          (l) =>
            !usedLocal.has(l.queueId) &&
            !localToDb.has(l.queueId) &&
            l.id === r.video_id &&
            (l.reservedBy ?? "Guest") === (r.reserved_by ?? "Guest"),
        );
        if (match) {
          usedLocal.add(match.queueId);
          link(match.queueId, r.id);
        } else {
          unmatched.push(r);
        }
      }
      unmatched.forEach(ingestRow);
    });

    // ---- Realtime queue (inbound from phones) ----
    const queueCh = supabase
      .channel(`room-queue-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "queue_items", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as QueueItemRow;
          setQueue((q) => (q.some((r) => r.id === row.id) ? q : [...q, row]));
          if (dbToLocal.has(row.id)) return; // our own echo
          ingestRow(row);
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "queue_items", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const id = (payload.old as QueueItemRow).id;
          setQueue((q) => q.filter((r) => r.id !== id));
          const queueId = dbToLocal.get(id);
          if (queueId) {
            dbToLocal.delete(id);
            localToDb.delete(queueId);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "queue_items", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const row = payload.new as QueueItemRow;
          setQueue((q) => q.map((r) => (r.id === row.id ? row : r)));
        },
      )
      .subscribe();

    // ---- Realtime commands ----
    const cmdCh = supabase
      .channel(`room-cmd-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_commands",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const row = payload.new as PlayerCommandRow;
          if ((row.command as string) === "now_playing") return;
          window.dispatchEvent(
            new CustomEvent("karaoke:remote-cmd", { detail: { command: row.command, payload: row.payload } }),
          );
          supabase.from("player_commands").delete().eq("id", row.id).then(() => {});
        },
      )
      .subscribe();

    // ---- Outbound sync: mirror local queue into DB ----
    let prevQueue = useKaraoke.getState().queue;

    const syncOutbound = (cur: QueueItem[]) => {
      // Inserts: any local item without a mapped DB row. Skip while we're
      // in the middle of ingesting an inbound row (the mapping is set right
      // after reserve() returns, but the store subscriber fires first).
      if (ingesting > 0) return;
      cur.forEach((item, i) => {
        if (localToDb.has(item.queueId)) return;
        // Optimistically claim so we don't double-insert on rapid changes.
        localToDb.set(item.queueId, "__pending__");
        insertQueueItem(
          roomId,
          {
            id: item.id,
            title: item.title,
            artist: item.artist,
            channel: item.channel,
            duration: item.duration,
            views: item.views,
            publishedAt: item.publishedAt,
            thumbnail: item.thumbnail,
            category: item.category,
          },
          item.reservedBy ?? "TV",
          Date.now() + i,
        )
          .then((row) => {
            link(item.queueId, row.id);
            setQueue((q) => (q.some((r) => r.id === row.id) ? q : [...q, row]));
          })
          .catch(() => {
            localToDb.delete(item.queueId);
          });
      });

      // Deletes: mapped items that no longer exist locally.
      const curIds = new Set(cur.map((i) => i.queueId));
      for (const [qid, dbId] of Array.from(localToDb.entries())) {
        if (curIds.has(qid) || dbId === "__pending__") continue;
        unlink(qid);
        deleteQueueItem(dbId).catch(() => {});
        setQueue((q) => q.filter((r) => r.id !== dbId));
      }

      // Reorder: rewrite positions if order changed.
      const prevOrder = prevQueue.map((i) => i.queueId).join("|");
      const curOrder = cur.map((i) => i.queueId).join("|");
      if (prevOrder !== curOrder) {
        cur.forEach((item, i) => {
          const dbId = localToDb.get(item.queueId);
          if (!dbId || dbId === "__pending__") return;
          updateQueuePosition(dbId, i).catch(() => {});
        });
      }
    };

    // Run once for anything already in the store (e.g. rehydrated queue).
    syncOutbound(prevQueue);

    // ---- Now-playing broadcast ----
    const currentSong = (): QueueItem | null => {
      const s = useKaraoke.getState();
      return s.currentIndex >= 0 ? s.queue[s.currentIndex] ?? null : null;
    };

    const broadcast = (song: QueueItem | null) => {
      sendCommand(roomId, "now_playing" as unknown as PlayerCommandRow["command"], song
        ? {
            song: {
              id: song.id,
              title: song.title,
              artist: song.artist,
              thumbnail: song.thumbnail,
              reservedBy: song.reservedBy ?? null,
            },
          }
        : { song: null }).catch(() => {});
    };

    let prevCurrent: QueueItem | null = currentSong();
    broadcast(prevCurrent);

    const unsub = useKaraoke.subscribe((s) => {
      // Queue diff -> mirror to DB
      if (s.queue !== prevQueue) {
        syncOutbound(s.queue);
        prevQueue = s.queue;
      }
      // Track change -> broadcast now-playing
      const cur = s.currentIndex >= 0 ? s.queue[s.currentIndex] ?? null : null;
      if ((prevCurrent?.queueId ?? null) !== (cur?.queueId ?? null)) {
        prevCurrent = cur;
        broadcast(cur);
      }
    });

    const hb = window.setInterval(() => broadcast(currentSong()), 8000);

    return () => {
      cancelled = true;
      unsub();
      window.clearInterval(hb);
      broadcast(null);
      supabase.removeChannel(queueCh);
      supabase.removeChannel(cmdCh);
    };
  }, [roomId]);

  return { queue };
}
