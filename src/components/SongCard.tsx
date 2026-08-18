import { useNavigate } from "@tanstack/react-router";
import { Play, Plus, Heart, Eye, Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { Song } from "@/lib/mock-data";
import { useKaraoke } from "@/stores/karaoke-store";
import { toast } from "sonner";

type Props = { song: Song; index?: number; variant?: "card" | "row" };

export function SongCard({ song, index = 0, variant = "card" }: Props) {
  const nav = useNavigate();
  const reserve = useKaraoke((s) => s.reserve);
  const playNow = useKaraoke((s) => s.playNow);
  const toggleFav = useKaraoke((s) => s.toggleFavorite);
  const isFav = useKaraoke((s) => s.favorites.some((f) => f.id === song.id));

  const doReserve = (e: React.MouseEvent) => {
    e.stopPropagation();
    reserve(song);
    toast.success("Reserved", { description: song.title });
  };
  const doPlayNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    playNow(song);
    nav({ to: "/player" });
  };
  const doFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFav(song);
  };

  if (variant === "row") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        onClick={doPlayNow}
        className="group flex cursor-pointer items-center gap-3 rounded-xl p-2 transition hover:bg-white/5"
      >
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-surface sm:w-40">
          <img src={song.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />
          <div className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
            <Play className="h-8 w-8 fill-white text-white" />
          </div>
          <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium">
            {song.duration}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold sm:text-base">{song.title}</div>
          <div className="truncate text-xs text-white/50 sm:text-sm">
            {song.artist} • {song.channel}
          </div>
          <div className="mt-1 hidden items-center gap-3 text-xs text-white/40 sm:flex">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{song.views}</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{song.publishedAt}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={doFav}
            className={`grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/10 ${isFav ? "text-primary" : "text-white/60"}`}
            aria-label="Favorite"
          >
            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
          </button>
          <button
            onClick={doReserve}
            className="hidden items-center gap-1.5 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-gold hover:bg-gold/10 hover:text-gold sm:flex"
          >
            <Plus className="h-3.5 w-3.5" /> Reserve
          </button>
          <button
            onClick={doPlayNow}
            className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow-red transition hover:scale-105"
          >
            <Play className="h-3.5 w-3.5 fill-current" /> Play
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -4 }}
      onClick={doPlayNow}
      className="group relative w-[220px] shrink-0 cursor-pointer overflow-hidden rounded-2xl bg-surface/80 p-2 ring-1 ring-white/5 transition hover:ring-white/15 sm:w-[240px]"
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
        <img
          src={song.thumbnail}
          alt={song.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-semibold">
          {song.duration}
        </span>
        <div className="absolute inset-0 flex items-end justify-between p-2 opacity-0 transition group-hover:opacity-100">
          <button
            onClick={doReserve}
            className="rounded-full bg-gold/90 px-3 py-1.5 text-xs font-bold text-black shadow-glow-gold transition hover:scale-105"
          >
            + Reserve
          </button>
          <button
            onClick={doPlayNow}
            className="grid h-10 w-10 place-items-center rounded-full bg-primary shadow-glow-red transition hover:scale-110"
            aria-label="Play"
          >
            <Play className="h-5 w-5 fill-white text-white" />
          </button>
        </div>
      </div>
      <div className="flex items-start gap-2 p-2 pt-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{song.title}</div>
          <div className="truncate text-xs text-white/50">{song.artist}</div>
        </div>
        <button
          onClick={doFav}
          className={`shrink-0 rounded-full p-1.5 transition ${isFav ? "text-primary" : "text-white/50 hover:text-white"}`}
          aria-label="Favorite"
        >
          <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
        </button>
      </div>
    </motion.div>
  );
}
