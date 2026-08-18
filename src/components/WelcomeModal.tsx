import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic2, Tv, Radio, ListMusic, Sparkles, Heart, Coffee, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const GCASH_NUMBER = "09927387874";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOpen(true);
  }, []);

  const close = () => setOpen(false);

  const copyGcash = async () => {
    try {
      await navigator.clipboard.writeText(GCASH_NUMBER);
      setCopied(true);
      toast.success("GCash number copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Couldn't copy — long-press to select");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="glass relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 p-6 shadow-2xl"
          >
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-widest text-white/60">
                <Sparkles className="h-3 w-3 text-gold" />
                Welcome
              </div>
              <h2 className="mt-3 font-display text-3xl font-black leading-tight">
                Welcome to&nbsp;<span className="text-gradient-fire">Kantatero Hub</span>
              </h2>
              <p className="mt-2 text-sm text-white/60">
                Your all-in-one karaoke party companion. Here's what you can do:
              </p>

              <ul className="mt-5 space-y-3">
                <li className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                    <Tv className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Host on your TV</p>
                    <p className="text-xs text-white/50">Turn any screen into the karaoke display.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
                    <Radio className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Join from your phone</p>
                    <p className="text-xs text-white/50">Enter the room code and take control.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/10 text-white">
                    <ListMusic className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Reserve songs together</p>
                    <p className="text-xs text-white/50">Search YouTube karaoke and queue up next.</p>
                  </div>
                </li>
              </ul>

              {/* Support the creator */}
              <div className="mt-5 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-primary/10 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold">
                  <Coffee className="h-3.5 w-3.5" />
                  Support the creator
                </div>
                <p className="mt-1.5 text-xs text-white/60">
                  Enjoying Kantatero Hub? Buy me a coffee via GCash to keep this project alive.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2 pl-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-white/40">GCash</p>
                    <p className="truncate font-display text-base font-bold tracking-wider text-white">
                      {GCASH_NUMBER}
                    </p>
                  </div>
                  <button
                    onClick={copyGcash}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gold/20 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/30"
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Heart className="h-3.5 w-3.5 text-primary" />
                  Thank you for using this!
                </div>
                <div className="text-right text-[10px] uppercase tracking-widest text-white/40">
                  by <span className="text-white/80">Mark Cruz</span>
                </div>
              </div>

              <button
                onClick={close}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow-red"
              >
                <Mic2 className="h-4 w-4" />
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
