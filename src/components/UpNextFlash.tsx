import { useKaraoke } from "@/stores/karaoke-store";
import { motion, AnimatePresence } from "framer-motion";
import { SkipForward, User } from "lucide-react";

export function UpNextFlash() {
  const queue = useKaraoke((s) => s.queue);
  const currentIndex = useKaraoke((s) => s.currentIndex);
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : queue.length > 0 ? 1 : -1;
  const next = nextIndex >= 0 ? queue[nextIndex] : undefined;

  if (!next) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={next.queueId}
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.35 }}
        className="glass flex items-center gap-3 rounded-2xl border border-white/5 p-3"
      >
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <SkipForward className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            <span className="animate-pulse">●</span> Up Next
          </div>
          <div className="truncate text-sm font-semibold">{next.title}</div>
          <div className="truncate text-xs text-white/50">{next.artist}</div>
        </div>
        {next.reservedBy && (
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 sm:flex">
            <User className="h-3.5 w-3.5 text-gold" />
            <span className="font-medium">{next.reservedBy}</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
