import { useState } from "react";
import { useKaraoke } from "@/stores/karaoke-store";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import {
  X, ChevronUp, ChevronDown, Trash2,
  ListMusic, Clock, PlayCircle, Search, Loader2, Plus, Minus, Settings as SettingsIcon, Repeat, QrCode, Users,
} from "lucide-react";

import { durationToSeconds } from "@/lib/mock-data";
import { useQuery } from "@tanstack/react-query";
import { searchYouTubeKaraoke } from "@/lib/youtube.functions";
import { getCachedResults, setCachedResults, normalizeQuery } from "@/lib/search-cache";
import { toast } from "sonner";


type Tab = "queue" | "search" | "settings";

export function QueueSidebar({ compact = false }: { compact?: boolean }) {
  const [tab, setTab] = useState<Tab>("queue");
  const queue = useKaraoke((s) => s.queue);
  const currentIndex = useKaraoke((s) => s.currentIndex);
  const removeAt = useKaraoke((s) => s.removeAt);
  const moveUp = useKaraoke((s) => s.moveUp);
  const moveDown = useKaraoke((s) => s.moveDown);
  const clearQueue = useKaraoke((s) => s.clearQueue);
  const reorder = useKaraoke((s) => s.reorder);
  const setCurrentIndex = useKaraoke((s) => s.setCurrentIndex);
  const reserve = useKaraoke((s) => s.reserve);
  const autoNext = useKaraoke((s) => s.autoNext);
  const toggleAutoNext = useKaraoke((s) => s.toggleAutoNext);
  const maxReservations = useKaraoke((s) => s.maxReservationsPerGuest);
  const setMaxReservations = useKaraoke((s) => s.setMaxReservationsPerGuest);


  const upcoming = queue.slice(Math.max(currentIndex + 1, 0));
  const totalWait = upcoming.reduce((acc, s) => acc + durationToSeconds(s.duration), 0);
  const waitMin = Math.floor(totalWait / 60);

  // --- Search state (kept mounted so switching tabs preserves results) ---
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const normalized = normalizeQuery(submitted);
  const { data: results = [], isFetching, isError, error } = useQuery({
    queryKey: ["yt-search-panel", normalized],
    queryFn: async () => {
      const cached = getCachedResults(normalized);
      if (cached) return cached;
      const fresh = await searchYouTubeKaraoke({ data: { query: normalized } });
      setCachedResults(normalized, fresh);
      return fresh;
    },
    enabled: normalized.length >= 2,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: (count, err) => count < 1 && !/quota/i.test((err as Error)?.message ?? ""),
  });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const v = q.trim();
    if (v.length < 2) return;
    setSubmitted(v);
  };


  return (
    <aside id="pair-modal-slot" className={`glass-strong relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 ${compact ? "" : ""}`}>
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 p-2">
        <TabButton active={tab === "queue"} onClick={() => setTab("queue")}>
          <ListMusic className="h-4 w-4" />
          Queue
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{queue.length}</span>
        </TabButton>
        <TabButton active={tab === "search"} onClick={() => setTab("search")}>
          <Search className="h-4 w-4" />
          Add song
        </TabButton>
        <TabButton active={tab === "settings"} onClick={() => setTab("settings")}>
          <SettingsIcon className="h-4 w-4" />
          Settings
        </TabButton>

      </div>

      {tab === "queue" && (
        <>
          <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2 text-xs text-white/50">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {upcoming.length ? `~${waitMin} min wait • ${upcoming.length} up next` : "Nothing queued"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {queue.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center">
                <div>
                  <ListMusic className="mx-auto h-10 w-10 text-white/20" />
                  <p className="mt-3 text-sm text-white/50">
                    No songs reserved yet.
                    <br />Open <button onClick={() => setTab("search")} className="text-gold underline underline-offset-2">Add song</button> to reserve.
                  </p>
                </div>
              </div>
            ) : (
              <Reorder.Group
                axis="y"
                values={queue}
                onReorder={(newOrder) => {
                  const currentIds = queue.map((q) => q.queueId);
                  const newIds = newOrder.map((q) => q.queueId);
                  for (let i = 0; i < newIds.length; i++) {
                    if (newIds[i] !== currentIds[i]) {
                      const from = currentIds.indexOf(newIds[i]);
                      reorder(from, i);
                      return;
                    }
                  }
                }}
                className="space-y-1"
              >
                <AnimatePresence initial={false}>
                  {queue.map((item, i) => {
                    const isCurrent = i === currentIndex;
                    const isPast = i < currentIndex;
                    return (
                      <Reorder.Item
                        key={item.queueId}
                        value={item}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        className={`group flex cursor-grab items-center gap-2 rounded-xl p-2 active:cursor-grabbing ${
                          isCurrent
                            ? "bg-primary/15 ring-1 ring-primary/40"
                            : isPast
                            ? "opacity-40 hover:bg-white/5"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="grid w-6 shrink-0 place-items-center text-xs font-semibold text-white/40">
                          {isCurrent ? (
                            <span className="flex items-end gap-[2px]" aria-label="Now playing">
                              <span className="eq-bar h-3 w-[3px] rounded-sm bg-primary" style={{ animationDelay: "0ms" }} />
                              <span className="eq-bar h-4 w-[3px] rounded-sm bg-primary" style={{ animationDelay: "120ms" }} />
                              <span className="eq-bar h-2 w-[3px] rounded-sm bg-primary" style={{ animationDelay: "240ms" }} />
                            </span>
                          ) : (
                            i + 1
                          )}
                        </div>
                        <button
                          onClick={() => setCurrentIndex(i)}
                          className="relative aspect-video w-16 shrink-0 overflow-hidden rounded-md bg-black"
                        >
                          <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
                          <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                            <PlayCircle className="h-5 w-5" />
                          </div>
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-semibold sm:text-sm">{item.title}</div>
                          <div className="truncate text-[11px] text-white/50">
                            {item.artist} • {item.reservedBy}
                          </div>
                        </div>
                        <div className="flex shrink-0 opacity-100 transition xl:opacity-0 xl:group-hover:opacity-100">
                          <button onClick={() => moveUp(i)} className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white" aria-label="Move up">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => moveDown(i)} className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-white/10 hover:text-white" aria-label="Move down">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => removeAt(i)} className="grid h-7 w-7 place-items-center rounded-md text-white/60 hover:bg-primary/20 hover:text-primary" aria-label="Remove">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </AnimatePresence>
              </Reorder.Group>
            )}
          </div>
        </>
      )}
      {tab === "search" && (
        <>
          <div className="border-b border-white/5 p-3">
            <form
              onSubmit={submitSearch}
              className="flex items-center gap-2 rounded-full bg-white/5 pl-4 pr-1.5 h-11 ring-1 ring-white/5 focus-within:ring-primary/50 transition"
            >
              <Search className="h-4 w-4 shrink-0 text-white/50" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search karaoke…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setSubmitted("");
                  }}
                  className="grid h-7 w-7 place-items-center rounded-full text-white/50 hover:bg-white/10"
                  aria-label="Clear"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow-red transition hover:scale-105"
              >
                Go
              </button>
            </form>
            <p className="mt-2 text-[11px] text-white/40">
              Reserve songs without pausing the player.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {!submitted ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-white/50">
                Search a song or artist to reserve.
              </div>
            ) : isFetching ? (
              <div className="grid h-full place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-white/60" />
              </div>
            ) : isError ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-white/60">
                <div>
                  <p>Couldn't reach YouTube.</p>
                  <p className="mt-1 text-[11px] text-white/40">{(error as Error)?.message}</p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="grid h-full place-items-center px-4 text-center text-sm text-white/50">
                No karaoke tracks found.
              </div>
            ) : (
              <ul className="space-y-1">
                <AnimatePresence initial={false}>
                  {results.map((s, i) => (
                    <motion.li
                      key={s.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.015 }}
                      className="group flex items-center gap-2 rounded-xl p-2 hover:bg-white/5"
                    >
                      <div className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-md bg-black">
                        <img src={s.thumbnail} alt="" className="h-full w-full object-cover" />
                        {s.duration && (
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 text-[9px] font-semibold">
                            {s.duration}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold sm:text-sm">{s.title}</div>
                        <div className="truncate text-[11px] text-white/50">{s.artist}</div>
                      </div>
                      <button
                        onClick={() => {
                          reserve(s);
                          toast.success("Reserved", { description: s.title });
                        }}
                        className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-white/80 transition hover:border-gold hover:bg-gold/10 hover:text-gold"
                      >
                        <Plus className="h-3 w-3" /> Reserve
                      </button>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </>
      )}
      {tab === "settings" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Room
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event("karaoke:show-pair"))}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition hover:bg-primary/10 hover:border-primary/40"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                <QrCode className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Pair a phone</span>
                <span className="block text-[11px] text-white/50">Show the QR code so phones can join and reserve songs.</span>
              </span>
            </span>
          </button>
          <button
            onClick={() => window.dispatchEvent(new Event("karaoke:end-room"))}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition hover:bg-primary/10 hover:border-primary/40"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                <X className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">End host room</span>
                <span className="block text-[11px] text-white/50">Close the room and disconnect any paired phones.</span>
              </span>
            </span>
          </button>

          <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Playback
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 hover:bg-white/[0.07]">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                <Repeat className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Autoplay next</span>
                <span className="block text-[11px] text-white/50">Start the next song automatically when one ends.</span>
              </span>
            </span>
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${autoNext ? "bg-primary" : "bg-white/15"}`}>
              <input
                type="checkbox"
                checked={autoNext}
                onChange={toggleAutoNext}
                className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Autoplay next"
              />
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${autoNext ? "left-[22px]" : "left-0.5"}`} />
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3">
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                <Users className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Max songs per guest</span>
                <span className="block text-[11px] text-white/50">Limit how many songs each paired guest can reserve.</span>
              </span>
            </span>
            <span className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setMaxReservations(maxReservations - 1)}
                disabled={maxReservations <= 1}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white transition hover:bg-primary/30 disabled:opacity-40"
                aria-label="Decrease limit"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[1.75rem] text-center text-sm font-semibold tabular-nums">
                {maxReservations}
              </span>
              <button
                type="button"
                onClick={() => setMaxReservations(maxReservations + 1)}
                disabled={maxReservations >= 99}
                className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white transition hover:bg-primary/30 disabled:opacity-40"
                aria-label="Increase limit"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>

          <ShowTickerToggle />
          <TickerModeControl />
          <TickerSpeedControl />





          <div className="pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
            Queue
          </div>
          <button
            onClick={() => {
              if (!queue.length) return;
              clearQueue();
              toast.success("Queue cleared");
            }}
            disabled={!queue.length}
            className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition hover:bg-primary/10 hover:border-primary/40 disabled:opacity-40 disabled:hover:bg-white/5 disabled:hover:border-white/5"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                <Trash2 className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Clear queue</span>
                <span className="block text-[11px] text-white/50">Remove all reserved songs from the queue.</span>
              </span>
            </span>
            <span className="text-[11px] text-white/40">{queue.length} songs</span>
          </button>

          <p className="pt-2 text-[11px] text-white/40">
            Up Next preview appears in the last 15 seconds of the current song.
          </p>
        </div>
      )}
    </aside>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-white/10 text-white ring-1 ring-white/15"
          : "text-white/60 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function TickerSpeedControl() {
  const speed = useKaraoke((s) => s.tickerSpeed);
  const setSpeed = useKaraoke((s) => s.setTickerSpeed);
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
            <ListMusic className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Ticker speed</span>
            <span className="block text-[11px] text-white/50">Reserved-songs scroll speed (px/sec).</span>
          </span>
        </span>
        <span className="min-w-[2.5rem] rounded-full bg-white/10 px-2 py-0.5 text-center text-xs font-semibold tabular-nums">
          {speed}
        </span>
      </div>
      <input
        type="range"
        min={10}
        max={70}
        step={10}
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="mt-3 w-full accent-primary"
        aria-label="Ticker speed"
      />
      <div className="mt-1 flex justify-between text-[10px] text-white/40 tabular-nums">
        <span>10</span><span>20</span><span>30</span><span>40</span><span>50</span><span>60</span><span>70</span>
      </div>
    </div>
  );
}

function TickerModeControl() {
  const mode = useKaraoke((s) => s.tickerMode);
  const setMode = useKaraoke((s) => s.setTickerMode);
  const nextOnly = mode === "next";
  return (
    <button
      type="button"
      onClick={() => setMode(nextOnly ? "all" : "next")}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition hover:bg-primary/10 hover:border-primary/40"
      aria-pressed={nextOnly}
    >
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <ListMusic className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Up Next only</span>
          <span className="block text-[11px] text-white/50">
            Show only the next reserved song instead of the full list.
          </span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          nextOnly ? "bg-primary" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            nextOnly ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

function ShowTickerToggle() {
  const showTicker = useKaraoke((s) => s.showTicker);
  const setShowTicker = useKaraoke((s) => s.setShowTicker);
  return (
    <button
      type="button"
      onClick={() => setShowTicker(!showTicker)}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-3 text-left transition hover:bg-primary/10 hover:border-primary/40"
      aria-pressed={showTicker}
    >
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
          <ListMusic className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Reserved-songs ticker</span>
          <span className="block text-[11px] text-white/50">Show upcoming reservations scrolling on the video.</span>
        </span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          showTicker ? "bg-primary" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            showTicker ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
