import type { Song } from "@/lib/mock-data";

// Persistent karaoke search cache — reduces YouTube API quota usage by
// serving repeat queries from localStorage across reloads and sessions.

const STORAGE_KEY = "yt-search-cache-v1";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 100;

type Entry = { at: number; results: Song[] };
type Store = Record<string, Entry>;

export function normalizeQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

function read(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function getCachedResults(query: string): Song[] | null {
  const key = normalizeQuery(query);
  if (!key) return null;
  const store = read();
  const hit = store[key];
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    delete store[key];
    write(store);
    return null;
  }
  return hit.results;
}

export function setCachedResults(query: string, results: Song[]) {
  const key = normalizeQuery(query);
  if (!key) return;
  const store = read();
  store[key] = { at: Date.now(), results };

  // Evict oldest entries if we exceed cap
  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => store[a].at - store[b].at);
    for (const k of sorted.slice(0, keys.length - MAX_ENTRIES)) delete store[k];
  }
  write(store);
}
