import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Song } from "@/lib/mock-data";

const safeStorage = () => {
  if (typeof window === "undefined") {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    };
  }
  return window.localStorage;
};

export type QueueItem = Song & { queueId: string; reservedBy?: string };

type State = {
  queue: QueueItem[];
  currentIndex: number;      // index in queue currently playing, -1 if none
  autoNext: boolean;
  repeat: boolean;
  shuffleFlag: number;
  favorites: Song[];
  history: (Song & { playedAt: number })[];
  maxReservationsPerGuest: number;
  tickerSpeed: number;
  showTicker: boolean;
  tickerMode: "all" | "next";

  reserve: (song: Song, by?: string) => void;
  setMaxReservationsPerGuest: (n: number) => void;
  setTickerSpeed: (n: number) => void;
  setShowTicker: (v: boolean) => void;
  setTickerMode: (m: "all" | "next") => void;



  playNow: (song: Song) => void;
  removeAt: (idx: number) => void;
  moveUp: (idx: number) => void;
  moveDown: (idx: number) => void;
  clearQueue: () => void;
  shuffleQueue: () => void;
  reorder: (from: number, to: number) => void;
  setCurrentIndex: (i: number) => void;
  advance: () => void;
  previous: () => void;
  toggleAutoNext: () => void;
  toggleRepeat: () => void;

  toggleFavorite: (song: Song) => void;
  isFavorite: (id: string) => boolean;
  pushHistory: (song: Song) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const useKaraoke = create<State>()(
  persist(
    (set, get) => ({
      queue: [],
      currentIndex: -1,
      autoNext: true,
      repeat: false,
      shuffleFlag: 0,
      favorites: [],
      history: [],
      maxReservationsPerGuest: 10,
      tickerSpeed: 20,
      showTicker: true,
      tickerMode: "all",

      setMaxReservationsPerGuest: (n) =>
        set({ maxReservationsPerGuest: Math.max(1, Math.min(99, Math.floor(n))) }),
      setTickerSpeed: (n) =>
        set({ tickerSpeed: Math.max(10, Math.min(70, Math.round(n / 10) * 10)) }),
      setShowTicker: (v) => set({ showTicker: !!v }),
      setTickerMode: (m) => set({ tickerMode: m === "next" ? "next" : "all" }),



      reserve: (song, by) => {
        const reservedBy = by ?? "Guest";
        const { queue, maxReservationsPerGuest } = get();
        const isHost = reservedBy === "TV" || reservedBy === "You";
        if (!isHost) {
          const count = queue.filter(
            (q) => (q.reservedBy ?? "Guest").toLowerCase() === reservedBy.toLowerCase(),
          ).length;
          if (count >= maxReservationsPerGuest) {
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("karaoke:reserve-blocked", {
                  detail: { by: reservedBy, limit: maxReservationsPerGuest, title: song.title },
                }),
              );
            }
            return;
          }
        }
        set((s) => ({
          queue: [...s.queue, { ...song, queueId: uid(), reservedBy }],
        }));
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("karaoke:reserved", {
              detail: { title: song.title, by: reservedBy },
            }),
          );
        }
      },


      playNow: (song) =>
        set((s) => {
          const item: QueueItem = { ...song, queueId: uid(), reservedBy: "You" };
          const nextQueue = [...s.queue];
          const insertAt = s.currentIndex + 1;
          nextQueue.splice(insertAt, 0, item);
          return { queue: nextQueue, currentIndex: insertAt };
        }),

      removeAt: (idx) =>
        set((s) => {
          const q = s.queue.filter((_, i) => i !== idx);
          let ci = s.currentIndex;
          if (idx < ci) ci -= 1;
          else if (idx === ci) ci = Math.min(ci, q.length - 1);
          return { queue: q, currentIndex: q.length ? ci : -1 };
        }),

      moveUp: (idx) => {
        if (idx <= 0) return;
        get().reorder(idx, idx - 1);
      },
      moveDown: (idx) => {
        const len = get().queue.length;
        if (idx >= len - 1) return;
        get().reorder(idx, idx + 1);
      },

      reorder: (from, to) =>
        set((s) => {
          const q = [...s.queue];
          const [it] = q.splice(from, 1);
          q.splice(to, 0, it);
          let ci = s.currentIndex;
          if (from === ci) ci = to;
          else if (from < ci && to >= ci) ci -= 1;
          else if (from > ci && to <= ci) ci += 1;
          return { queue: q, currentIndex: ci };
        }),

      clearQueue: () => set({ queue: [], currentIndex: -1 }),

      shuffleQueue: () =>
        set((s) => {
          if (s.queue.length < 2) return s;
          const current = s.currentIndex >= 0 ? s.queue[s.currentIndex] : null;
          const rest = s.queue.filter((_, i) => i !== s.currentIndex);
          for (let i = rest.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [rest[i], rest[j]] = [rest[j], rest[i]];
          }
          const q = current ? [current, ...rest] : rest;
          return { queue: q, currentIndex: current ? 0 : -1, shuffleFlag: s.shuffleFlag + 1 };
        }),

      setCurrentIndex: (i) => set({ currentIndex: i }),

      advance: () =>
        set((s) => {
          if (!s.queue.length) return { currentIndex: -1 };
          const ci = s.currentIndex;
          // Remove the currently-playing track (auto-delete played)
          if (ci >= 0 && ci < s.queue.length) {
            const q = s.queue.filter((_, i) => i !== ci);
            if (!q.length) return { queue: [], currentIndex: -1 };
            // ci now points to what was "next"; wrap on repeat
            if (ci >= q.length) return { queue: q, currentIndex: s.repeat ? 0 : -1 };
            return { queue: q, currentIndex: ci };
          }
          // Nothing playing yet — just start from the top
          return { currentIndex: 0 };
        }),

      previous: () =>
        set((s) => ({ currentIndex: Math.max(0, s.currentIndex - 1) })),

      toggleAutoNext: () => set((s) => ({ autoNext: !s.autoNext })),
      toggleRepeat: () => set((s) => ({ repeat: !s.repeat })),

      toggleFavorite: (song) =>
        set((s) => {
          const exists = s.favorites.some((f) => f.id === song.id);
          return {
            favorites: exists
              ? s.favorites.filter((f) => f.id !== song.id)
              : [song, ...s.favorites],
          };
        }),
      isFavorite: (id) => get().favorites.some((f) => f.id === id),

      pushHistory: (song) =>
        set((s) => {
          const filtered = s.history.filter((h) => h.id !== song.id);
          return { history: [{ ...song, playedAt: Date.now() }, ...filtered].slice(0, 100) };
        }),
    }),
    {
      name: "karaoke-store",
      storage: createJSONStorage(() => safeStorage() as Storage),
      partialize: (s) => ({
        queue: s.queue,
        currentIndex: s.currentIndex,
        autoNext: s.autoNext,
        repeat: s.repeat,
        favorites: s.favorites,
        history: s.history,
        maxReservationsPerGuest: s.maxReservationsPerGuest,
        tickerSpeed: s.tickerSpeed,
        showTicker: s.showTicker,
        tickerMode: s.tickerMode,


      }),
    },
  ),
);

