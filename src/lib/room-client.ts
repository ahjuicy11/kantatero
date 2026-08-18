import { supabase } from "@/integrations/supabase/client";
import type { Song } from "@/lib/mock-data";

export type Room = {
  id: string;
  code: string;
  name: string | null;
  created_at: string;
};

export type QueueItemRow = {
  id: string;
  room_id: string;
  video_id: string;
  title: string;
  artist: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  reserved_by: string | null;
  position: number;
  status: "pending" | "playing" | "played" | "skipped";
  created_at: string;
};

export type PlayerCommandRow = {
  id: string;
  room_id: string;
  command: "play" | "pause" | "next" | "prev" | "restart" | "seek";
  payload: Record<string, unknown> | null;
  created_at: string;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no confusing chars
const genCode = (n = 6) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

export async function createRoom(name?: string): Promise<Room> {
  // Try a few times in the rare case of a collision.
  for (let i = 0; i < 6; i++) {
    const code = genCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code, name: name ?? null })
      .select()
      .single();
    if (!error && data) return data as Room;
    if (error && !`${error.message}`.toLowerCase().includes("duplicate")) throw error;
  }
  throw new Error("Could not generate a unique room code, try again");
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return (data as Room) ?? null;
}

export async function fetchQueue(roomId: string): Promise<QueueItemRow[]> {
  const { data, error } = await supabase
    .from("queue_items")
    .select("*")
    .eq("room_id", roomId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as QueueItemRow[]) ?? [];
}

export async function reserveSong(roomId: string, song: Song, by?: string) {
  const { error } = await supabase.from("queue_items").insert({
    room_id: roomId,
    video_id: song.id,
    title: song.title,
    artist: song.artist,
    thumbnail_url: song.thumbnail,
    duration_seconds: null,
    reserved_by: by ?? "Guest",
    position: Date.now(), // append order
    status: "pending",
  });
  if (error) throw error;
}

/** Insert a queue item and return the created row (host mirror). */
export async function insertQueueItem(
  roomId: string,
  song: Song,
  by: string,
  position: number,
): Promise<QueueItemRow> {
  const { data, error } = await supabase
    .from("queue_items")
    .insert({
      room_id: roomId,
      video_id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail_url: song.thumbnail,
      duration_seconds: null,
      reserved_by: by,
      position,
      status: "pending",
    })
    .select()
    .single();
  if (error) throw error;
  return data as QueueItemRow;
}

export async function updateQueuePosition(id: string, position: number) {
  await supabase.from("queue_items").update({ position }).eq("id", id);
}

export async function deleteQueueItem(id: string) {
  await supabase.from("queue_items").delete().eq("id", id);
}


export async function sendCommand(
  roomId: string,
  command: PlayerCommandRow["command"],
  payload?: Record<string, unknown>,
) {
  const { error } = await supabase.from("player_commands").insert({
    room_id: roomId,
    command,
    payload: (payload ?? null) as never,
  });
  if (error) throw error;
}

export function rowToSong(r: QueueItemRow): Song {
  return {
    id: r.video_id,
    title: r.title,
    artist: r.artist ?? "",
    channel: r.reserved_by ?? "Reserved",
    duration: "",
    views: "",
    publishedAt: "",
    thumbnail: r.thumbnail_url ?? `https://i.ytimg.com/vi/${r.video_id}/hqdefault.jpg`,
    category: "trending",
  };
}

// Small in-memory cache so we don't reserve the same row twice on the TV.
export const seenQueueIds = new Set<string>();
