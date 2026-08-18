import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Search, Mic, X } from "lucide-react";
import { smartSuggestions } from "@/lib/mock-data";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  autoFocus?: boolean;
  defaultValue?: string;
  size?: "lg" | "md";
};

export function SearchBar({ autoFocus, defaultValue = "", size = "lg" }: Props) {
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setOpen(false);
    nav({ to: "/search", search: { q: v } });
  };

  const startVoice = () => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return alert("Voice search not supported on this browser");
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      setQ(text);
      submit(text);
    };
    rec.start();
  };

  const heights = size === "lg" ? "h-14 text-base" : "h-11 text-sm";

  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(q);
        }}
        className={`glass-strong flex items-center gap-2 rounded-full pl-5 pr-2 ${heights} ring-1 ring-white/5 focus-within:ring-primary/50 transition-all`}
      >
        <Search className="h-5 w-5 shrink-0 text-white/50" />
        <input
          ref={ref}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search karaoke songs, artists…"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-white/40"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/10"
            aria-label="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={startVoice}
          className={`grid h-9 w-9 place-items-center rounded-full transition ${
            listening ? "bg-primary text-primary-foreground animate-pulse" : "hover:bg-white/10 text-white/70"
          }`}
          aria-label="Voice search"
        >
          <Mic className="h-4 w-4" />
        </button>
        <button
          type="submit"
          className="hidden shrink-0 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-glow-red transition hover:scale-105 sm:block"
        >
          Search
        </button>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass-strong absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/5 p-2 shadow-2xl"
          >
            <div className="px-3 pb-1 pt-2 text-xs uppercase tracking-wider text-white/40">
              {q ? "Smart suggestions" : "Popular"}
            </div>
            {smartSuggestions(q).map((s) => (
              <button
                key={s}
                onMouseDown={() => submit(s)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-white/5"
              >
                <Search className="h-4 w-4 text-white/40" />
                <span className="truncate">{s}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
