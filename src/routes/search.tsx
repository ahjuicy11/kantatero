import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { SearchBar } from "@/components/SearchBar";
import { SongCard } from "@/components/SongCard";
import { searchYouTubeKaraoke } from "@/lib/youtube.functions";
import { getCachedResults, setCachedResults, normalizeQuery } from "@/lib/search-cache";
import { motion } from "framer-motion";

const searchSchema = z.object({ q: z.string().optional().default("") });
const DEBOUNCE_MS = 700;
const MIN_CHARS = 3;

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  component: SearchPage,
  head: () => ({
    meta: [
      { title: "Search Karaoke — Karaoke" },
      { name: "description", content: "Search YouTube for any karaoke track — we auto-append 'karaoke' and surface the best matches." },
    ],
  }),
});

function SkeletonGrid() {
  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glass h-20 animate-pulse rounded-2xl" />
        ))}
      </div>
      <div className="hidden gap-4 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="glass aspect-[4/5] animate-pulse rounded-2xl" />
        ))}
      </div>
    </>
  );
}

function SearchPage() {
  const { q } = Route.useSearch();
  const normalized = normalizeQuery(q);

  // 700ms debounce — the URL updates immediately on submit, but the query fires
  // only after the user has stopped changing it.
  const [debouncedQ, setDebouncedQ] = useState(normalized);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(normalized), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [normalized]);

  const canSearch = debouncedQ.length >= MIN_CHARS;

  const { data: results = [], isFetching, isError, error } = useQuery({
    queryKey: ["yt-search", debouncedQ],
    queryFn: async ({ signal }) => {
      // Serve from localStorage cache first — reload-safe, no network at all.
      const cached = getCachedResults(debouncedQ);
      if (cached) return cached;
      const fresh = await searchYouTubeKaraoke({
        data: { query: debouncedQ },
        signal,
      } as Parameters<typeof searchYouTubeKaraoke>[0]);
      setCachedResults(debouncedQ, fresh);
      return fresh;
    },
    enabled: canSearch,
    staleTime: 24 * 60 * 60 * 1000, // 24h
    gcTime: 24 * 60 * 60 * 1000, // 24h
    retry: (count, err) => count < 1 && !/quota|unavailable/i.test((err as Error)?.message ?? ""),
  });

  const trimmed = q.trim();
  const errMsg = (error as Error)?.message ?? "";
  const isQuotaMsg = /quota|unavailable/i.test(errMsg);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <SearchBar autoFocus defaultValue={q} />
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {trimmed ? <>Results for <span className="text-gradient-fire">"{trimmed} karaoke"</span></> : "Search for a karaoke song"}
          </h1>
          <p className="text-sm text-white/50">
            {!canSearch && trimmed
              ? `Type at least ${MIN_CHARS} characters…`
              : isFetching
              ? "Searching YouTube…"
              : `${results.length} song${results.length === 1 ? "" : "s"}`}
          </p>
        </div>
      </div>

      {!trimmed ? (
        <div className="glass grid place-items-center rounded-3xl p-16 text-center text-white/50">
          Type a song or artist above to search real YouTube karaoke tracks.
        </div>
      ) : !canSearch ? (
        <div className="glass grid place-items-center rounded-3xl p-16 text-center text-white/50">
          Keep typing… we search once you've entered at least {MIN_CHARS} characters.
        </div>
      ) : isFetching ? (
        <SkeletonGrid />
      ) : isError ? (
        <div className="glass grid place-items-center rounded-3xl p-16 text-center">
          <p className="text-white/80">
            {isQuotaMsg
              ? "Live YouTube search is temporarily unavailable. Please try again later."
              : "Couldn't reach YouTube."}
          </p>
          {!isQuotaMsg && <p className="mt-1 text-xs text-white/40">{errMsg}</p>}
        </div>
      ) : results.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass grid place-items-center rounded-3xl p-16 text-center">
          <p className="text-white/60">No karaoke tracks found. Try another song or artist.</p>
        </motion.div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:hidden">
            {results.map((s, i) => (
              <SongCard key={s.id} song={s} index={i} variant="row" />
            ))}
          </div>
          <div className="hidden gap-4 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {results.map((s, i) => (
              <SongCard key={s.id} song={s} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
