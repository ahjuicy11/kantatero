import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Search, Plus, Loader2, Radio, LogOut, Music2, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchQueue,
  getRoomByCode,
  reserveSong,
  sendCommand,
  type QueueItemRow,
  type Room,
} from "@/lib/room-client";
import { type Song } from "@/lib/mock-data";
import { searchYouTubeKaraoke } from "@/lib/youtube.functions";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/r/$code")({
  component: RemotePage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Karaoke Remote" },
      { name: "description", content: "Reserve songs and control playback from your phone." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function RemotePage() {
  const { code } = Route.useParams();
  return (
    <ClientOnly fallback={<div className="p-8 text-center text-white/50">Connecting…</div>}>
      <RemoteInner code={code} />
    </ClientOnly>
  );
}

function RemoteInner({ code }: { code: string }) {
  const nav = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found">("loading");
  const [queue, setQueue] = useState<QueueItemRow[]>([]);
  const [nowPlaying, setNowPlaying] = useState<{
    id: string; title: string; artist?: string | null; thumbnail?: string | null; reservedBy?: string | null;
  } | null>(null);
  const [name, setName] = useState<string>(() => {
    if (typeof window === "undefined") return "Guest";
    return localStorage.getItem("karaoke.remote-name") || "Guest";
  });

  useEffect(() => {
    let cancelled = false;
    getRoomByCode(code)
      .then(async (r) => {
        if (cancelled) return;
        if (!r) { setStatus("not-found"); return; }
        setRoom(r);
        setStatus("ready");
        const rows = await fetchQueue(r.id);
        if (!cancelled) setQueue(rows);
      })
      .catch(() => setStatus("not-found"));
    return () => { cancelled = true; };
  }, [code]);

  useEffect(() => {
    if (!room) return;
    const ch = supabase
      .channel(`remote-queue-${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "queue_items", filter: `room_id=eq.${room.id}` },
        () => {
          fetchQueue(room.id).then(setQueue).catch(() => {});
        },
      )
      .subscribe();

    const cmdCh = supabase
      .channel(`remote-cmd-${room.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "player_commands", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const row = payload.new as { command: string; payload: { song?: typeof nowPlaying } | null };
          if (row.command !== "now_playing") return;
          setNowPlaying(row.payload?.song ?? null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      supabase.removeChannel(cmdCh);
    };
  }, [room?.id]);

  const saveName = (v: string) => {
    setName(v);
    localStorage.setItem("karaoke.remote-name", v);
  };

  if (status === "loading") {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (status === "not-found" || !room) {
    return <JoinScreen initialCode={code} onLeave={() => nav({ to: "/" })} />;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-4 pb-32 sm:px-6">
      {/* Header */}
      <div className="glass mb-4 flex items-center gap-3 rounded-2xl border border-white/5 p-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase tracking-widest text-white/50">Connected</div>
          <div className="truncate font-display text-lg font-bold tracking-widest text-gradient-fire">
            {room.code}
          </div>
        </div>
        <button
          onClick={() => nav({ to: "/r/join" as never })}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white/60 hover:bg-white/10"
          aria-label="Leave"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      {/* Now playing */}
      {nowPlaying ? (
        <div className="glass mb-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 shadow-glow-red">
          <img
            src={nowPlaying.thumbnail ?? `https://i.ytimg.com/vi/${nowPlaying.id}/hqdefault.jpg`}
            alt=""
            className="h-14 w-20 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Now playing
            </div>
            <div className="truncate text-sm font-semibold">{nowPlaying.title}</div>
            <div className="truncate text-xs text-white/50">
              {nowPlaying.artist || "—"}
              {nowPlaying.reservedBy ? ` · ${nowPlaying.reservedBy}` : ""}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass mb-4 rounded-2xl border border-white/5 p-3 text-center text-xs text-white/40">
          Waiting for the TV to start a song…
        </div>
      )}


      {/* Nickname */}
      <div className="mb-4">
        <label className="mb-1 block text-[10px] uppercase tracking-widest text-white/40">Your name</label>
        <input
          value={name}
          onChange={(e) => saveName(e.target.value.slice(0, 24))}
          placeholder="Your name"
          className="glass w-full rounded-xl border border-white/5 bg-transparent px-3 py-2 text-sm outline-none focus:border-primary/40"
        />
      </div>

      {/* Search + reserve */}
      <SearchAndReserve
        onReserve={async (song) => {
          try {
            await reserveSong(room.id, song, name || "Guest");
            toast.success(`Reserved: ${song.title}`);
          } catch {
            toast.error("Could not reserve");
          }
        }}
      />

      {/* Queue preview */}
      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-semibold uppercase tracking-widest text-white/50">Up next</div>
          <div className="text-xs text-white/40">{queue.filter((q) => q.status !== "played").length} in queue</div>
        </div>
        <div className="space-y-2">
          {queue.length === 0 && (
            <div className="glass grid place-items-center rounded-2xl border border-white/5 p-6 text-center text-sm text-white/50">
              <Music2 className="mb-2 h-5 w-5" />
              Nothing reserved yet. Search a song above to start.
            </div>
          )}
          {queue.slice(0, 20).map((r, i) => (
            <div key={r.id} className="glass flex items-center gap-3 rounded-xl border border-white/5 p-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-xs font-bold">
                {i + 1}
              </div>
              <img
                src={r.thumbnail_url ?? `https://i.ytimg.com/vi/${r.video_id}/hqdefault.jpg`}
                alt=""
                className="h-10 w-16 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{r.title}</div>
                <div className="truncate text-xs text-white/50">
                  {r.artist || "—"} · {r.reserved_by || "Guest"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom playback dock */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-background/95 px-4 py-3 backdrop-blur-lg">
        <div className="mx-auto flex max-w-xl items-center justify-around gap-2">
          <TransportBtn label="Restart" onClick={() => sendCommand(room.id, "restart")}>
            <RotateCcw className="h-5 w-5" />
          </TransportBtn>
          <TransportBtn label="Previous" onClick={() => sendCommand(room.id, "prev")}>
            <SkipBack className="h-5 w-5" />
          </TransportBtn>
          <button
            onClick={() => sendCommand(room.id, "play")}
            className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow-red active:scale-95"
            aria-label="Play"
          >
            <Play className="h-6 w-6 fill-current" />
          </button>
          <TransportBtn label="Pause" onClick={() => sendCommand(room.id, "pause")}>
            <Pause className="h-5 w-5" />
          </TransportBtn>
          <TransportBtn label="Next" onClick={() => sendCommand(room.id, "next")}>
            <SkipForward className="h-5 w-5" />
          </TransportBtn>
        </div>
      </div>
    </div>
  );
}

function TransportBtn({
  onClick, children, label,
}: { onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid h-12 w-12 place-items-center rounded-full bg-white/5 text-white/80 hover:bg-white/10 active:scale-95"
    >
      {children}
    </button>
  );
}

function SearchAndReserve({ onReserve }: { onReserve: (s: Song) => void }) {
  const [q, setQ] = useState("");
  // Search only runs when the user explicitly submits — no live/quick search,
  // which keeps YouTube API quota usage low.
  const [submitted, setSubmitted] = useState("");

  const { data: results = [], isFetching } = useQuery({
    queryKey: ["yt-search-remote", submitted],
    queryFn: () => searchYouTubeKaraoke({ data: { query: submitted, maxResults: 10 } }),
    enabled: submitted.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const clear = () => {
    setQ("");
    setSubmitted("");
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = q.trim();
          if (v.length < 3) return;
          setSubmitted(v);
        }}
        className="glass flex items-center gap-2 rounded-full border border-white/5 px-4 py-2"
      >
        <Search className="h-4 w-4 shrink-0 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search karaoke songs, artists…"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
        />
        {isFetching && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white/40" />}
        {(q || submitted) && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear search"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-white/50 hover:bg-white/10 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={q.trim().length < 3}
          className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow-red disabled:opacity-40 active:scale-95"
        >
          Search
        </button>
      </form>
      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 space-y-2"
          >
            {results.map((s: Song) => (
              <div key={s.id} className="glass flex items-center gap-3 rounded-xl border border-white/5 p-2">
                <img src={s.thumbnail} alt="" className="h-12 w-20 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.title}</div>
                  <div className="truncate text-xs text-white/50">{s.artist}</div>
                </div>
                <button
                  onClick={() => onReserve(s)}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow-red active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" /> Reserve
                </button>
              </div>
            ))}
            {!isFetching && results.length === 0 && (
              <div className="text-center text-xs text-white/40">No karaoke tracks for "{submitted}"</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


function JoinScreen({ initialCode, onLeave }: { initialCode?: string; onLeave: () => void }) {
  const nav = useNavigate();
  const [code, setCode] = useState((initialCode || "").toUpperCase());
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await getRoomByCode(code.trim());
      if (!r) { toast.error("Room not found"); return; }
      nav({ to: "/r/$code", params: { code: r.code } });
    } catch {
      toast.error("Could not join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <div className="glass w-full rounded-3xl border border-white/5 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Radio className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-xl font-bold">Join a karaoke room</h1>
        <p className="mt-1 text-sm text-white/50">
          {initialCode ? `Code "${initialCode}" not found.` : "Enter the code shown on the TV screen."}
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-center font-display text-3xl font-black tracking-[0.4em] text-gradient-fire outline-none focus:border-primary/50"
        />
        <button
          onClick={join}
          disabled={busy || !code}
          className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow-red disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join room"}
        </button>
        <button onClick={onLeave} className="mt-2 text-xs text-white/50 hover:text-white/70">
          Back to home
        </button>
      </div>
    </div>
  );
}
