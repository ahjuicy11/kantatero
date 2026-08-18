import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Song } from "@/lib/mock-data";

const inputSchema = z.object({
  query: z.string().trim().min(1).max(120),
  maxResults: z.number().int().min(1).max(25).optional().default(10),
});

// ============ Server-side shared cache (per worker instance) ============
// Shared across all users hitting the same worker. TTL 24h.
type CachedEntry = { at: number; results: Song[] };
const SERVER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const serverCache = new Map<string, CachedEntry>();
// De-dupe concurrent identical requests: everyone awaits the same promise.
const inFlight = new Map<string, Promise<Song[]>>();

function normalize(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, " ");
}

// Sentinel thrown when the YouTube API rejects due to quota — surfaced to UI
// with a friendly message.
export class QuotaExhaustedError extends Error {
  constructor() {
    super("Live YouTube search is temporarily unavailable. Please try again later.");
    this.name = "QuotaExhaustedError";
  }
}


function parseIsoDuration(iso: string): string {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso ?? "");
  if (!m) return "0:00";
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(min)}:${pad(s)}` : `${min}:${pad(s)}`;
}

function formatViews(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function extractArtist(title: string, channel: string): string {
  const cleaned = title
    .replace(/\(.*?\)/g, "")
    .replace(/\[.*?\]/g, "")
    .replace(/karaoke.*/i, "")
    .replace(/\|.*/g, "")
    .trim();
  const parts = cleaned.split(/\s[-–—]\s/);
  if (parts.length >= 2) return parts[0].trim();
  return channel;
}

// Per-worker-instance cooldown for exhausted/bad keys (~1h). Best-effort only.
// Keys are tracked by env var name so logs stay useful without exposing values.
const keyCooldownUntil = new Map<string, number>();
const COOLDOWN_MS = 60 * 60 * 1000;

type YouTubeKey = { name: string; value: string };

function collectKeys(): YouTubeKey[] {
  const env = process.env as Record<string, string | undefined>;
  const raw: YouTubeKey[] = [];
  // Primary key
  if (env.YOUTUBE_API_KEY?.trim()) raw.push({ name: "YOUTUBE_API_KEY", value: env.YOUTUBE_API_KEY.trim() });
  // Numbered backups: YOUTUBE_API_KEY_2 .. YOUTUBE_API_KEY_20
  for (let i = 2; i <= 20; i++) {
    const v = env[`YOUTUBE_API_KEY_${i}`];
    if (v && v.trim().length > 0) raw.push({ name: `YOUTUBE_API_KEY_${i}`, value: v.trim() });
  }
  const seen = new Set<string>();
  const deduped = raw.filter((k) => {
    if (seen.has(k.value)) return false;
    seen.add(k.value);
    return true;
  });
  const now = Date.now();
  const active = deduped.filter((k) => (keyCooldownUntil.get(k.name) ?? 0) <= now);
  // If every key is cooling down, fall back to trying all anyway (cooldown may be stale).
  return active.length ? active : deduped;
}


function isQuotaError(status: number, body: string): boolean {
  if (status === 429) return true;
  if (status === 403 && /quota|dailyLimitExceeded|rateLimitExceeded/i.test(body)) return true;
  return false;
}

function isKeySpecificError(status: number, body: string): boolean {
  if (status === 401 || status === 403 || status === 429) return true;
  // YouTube returns 400 for invalid/deleted API keys; rotate instead of aborting.
  if (status === 400 && /api key|keyInvalid|API_KEY_INVALID|invalid key/i.test(body)) return true;
  return false;
}

function summarizeYouTubeError(body: string): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string; status?: string; errors?: Array<{ reason?: string }> };
    };
    const reason = parsed.error?.errors?.[0]?.reason ?? parsed.error?.status;
    const message = parsed.error?.message;
    return [reason, message].filter(Boolean).join(" — ").slice(0, 260) || body.slice(0, 260);
  } catch {
    return body.slice(0, 260);
  }
}

async function fetchWithFailover(
  buildUrl: (key: string) => string,
  label: string,
): Promise<Response> {
  const keys = collectKeys();
  if (keys.length === 0) throw new Error("YOUTUBE_API_KEY is not configured");

  let lastBody = "";
  let lastStatus = 0;
  let anyQuota = false;
  let attempted = 0;
  for (const key of keys) {
    attempted += 1;
    const res = await fetch(buildUrl(key.value));
    if (res.ok) return res;
    const body = await res.text();
    lastBody = body;
    lastStatus = res.status;
    // Treat auth/quota/key-restriction failures as key-specific and fail over.
    // Only truly non-key request errors abort immediately.
    if (isKeySpecificError(res.status, body)) {
      if (isQuotaError(res.status, body)) anyQuota = true;
      console.warn(
        `[youtube] ${key.name} failed on ${label} (${res.status}); trying next. ${summarizeYouTubeError(body)}`,
      );
      keyCooldownUntil.set(key.name, Date.now() + COOLDOWN_MS);
      continue;
    }
    console.error(`[youtube] ${label} failed [${res.status}]: ${summarizeYouTubeError(body)}`);
    throw new Error(`YouTube ${label} failed (${res.status})`);
  }
  console.error(
    `[youtube] all ${attempted} configured keys failed on ${label} (last ${lastStatus}): ${summarizeYouTubeError(lastBody)}`,
  );
  if (anyQuota) throw new QuotaExhaustedError();
  throw new Error(`YouTube ${label} failed — all keys rejected (last ${lastStatus})`);
}


async function performSearch(query: string, maxResults: number): Promise<Song[]> {
  const q = /karaoke/i.test(query) ? query : `${query} karaoke`;

  const searchRes = await fetchWithFailover((key) => {
    const u = new URL("https://www.googleapis.com/youtube/v3/search");
    u.searchParams.set("part", "snippet");
    u.searchParams.set("type", "video");
    u.searchParams.set("videoEmbeddable", "true");
    u.searchParams.set("safeSearch", "none");
    u.searchParams.set("maxResults", String(maxResults));
    u.searchParams.set("q", q);
    u.searchParams.set("key", key);
    return u.toString();
  }, "search");

  const searchJson = (await searchRes.json()) as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        channelTitle: string;
        publishedAt: string;
        thumbnails: Record<string, { url: string } | undefined>;
      };
    }>;
  };

  const KARAOKE_RE = /\b(karaoke|sing[- ]?along|instrumental|lyrics?)\b/i;
  const EXCLUDE_RE = /\b(reaction|tutorial|lesson|how to sing|cover by|guitar cover|drum cover|live performance)\b/i;
  const items = (searchJson.items ?? []).filter((i) => {
    if (!i.id?.videoId) return false;
    const title = i.snippet.title ?? "";
    const desc = i.snippet.description ?? "";
    const channel = i.snippet.channelTitle ?? "";
    if (EXCLUDE_RE.test(title)) return false;
    if (!KARAOKE_RE.test(title)) return false;
    return KARAOKE_RE.test(desc) || /karaoke/i.test(channel);
  });

  if (items.length === 0) return [];

  const ids = items.map((i) => i.id.videoId).join(",");
  const videosRes = await fetchWithFailover((key) => {
    const u = new URL("https://www.googleapis.com/youtube/v3/videos");
    u.searchParams.set("part", "contentDetails,statistics");
    u.searchParams.set("id", ids);
    u.searchParams.set("key", key);
    return u.toString();
  }, "videos");

  const videosJson = (await videosRes.json()) as {
    items?: Array<{
      id: string;
      contentDetails: { duration: string };
      statistics: { viewCount?: string };
    }>;
  };
  const meta = new Map(
    (videosJson.items ?? []).map((v) => [
      v.id,
      {
        duration: parseIsoDuration(v.contentDetails.duration),
        views: formatViews(Number(v.statistics.viewCount ?? 0)),
      },
    ]),
  );

  return items.map((i): Song => {
    const m = meta.get(i.id.videoId);
    const thumb =
      i.snippet.thumbnails.high?.url ??
      i.snippet.thumbnails.medium?.url ??
      i.snippet.thumbnails.default?.url ??
      `https://i.ytimg.com/vi/${i.id.videoId}/hqdefault.jpg`;
    return {
      id: i.id.videoId,
      title: i.snippet.title,
      artist: extractArtist(i.snippet.title, i.snippet.channelTitle),
      channel: i.snippet.channelTitle,
      duration: m?.duration ?? "0:00",
      views: m?.views ?? "—",
      publishedAt: (i.snippet.publishedAt ?? "").slice(0, 4),
      thumbnail: thumb,
      category: "trending",
    };
  });
}

export const searchYouTubeKaraoke = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<Song[]> => {
    const cacheKey = `${normalize(data.query)}::${data.maxResults}`;

    // 1) Server cache hit — free, no YouTube call.
    const cached = serverCache.get(cacheKey);
    if (cached && Date.now() - cached.at < SERVER_CACHE_TTL_MS) {
      return cached.results;
    }

    // 2) In-flight de-dup — coalesce concurrent identical queries.
    const existing = inFlight.get(cacheKey);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const results = await performSearch(data.query, data.maxResults);
        serverCache.set(cacheKey, { at: Date.now(), results });
        return results;
      } catch (err) {
        // External API/key failures should never blank the app. Serve stale cache
        // when possible, otherwise return an empty result set and keep details in
        // server logs for fixing key restrictions/quota.
        if (cached) return cached.results;
        if (err instanceof QuotaExhaustedError || /all keys rejected|YouTube .*failed/i.test((err as Error)?.message ?? "")) {
          console.warn(`[youtube] returning empty search results for "${data.query}" because live search is unavailable.`);
          return [];
        }
        throw err;
      } finally {
        inFlight.delete(cacheKey);
      }
    })();

    inFlight.set(cacheKey, promise);
    return promise;
  });

