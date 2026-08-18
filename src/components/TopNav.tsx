import { Link, useRouterState } from "@tanstack/react-router";
import { Music2, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useKaraoke } from "@/stores/karaoke-store";

const HOST_KEY = "karaoke.hosted-room";

export function TopNav() {
  const queueLen = useKaraoke((s) => s.queue.length);
  const currentIndex = useKaraoke((s) => s.currentIndex);
  const upcoming = Math.max(0, queueLen - Math.max(0, currentIndex + 1));

  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hosting, setHosting] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        setHosting(!!localStorage.getItem(HOST_KEY));
      } catch {
        setHosting(false);
      }
    };
    check();
    const onStorage = (e: StorageEvent) => {
      if (e.key === HOST_KEY) check();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("karaoke:host-changed", check);
    const iv = window.setInterval(check, 1000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("karaoke:host-changed", check);
      window.clearInterval(iv);
    };
  }, []);

  if (hosting && pathname === "/player") return null;

  return (
    <header className="sticky top-0 z-40 glass-strong">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Link to="/" className="flex shrink-0 flex-1 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-glow-red">
            <Music2 className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold">
            <span className="text-gradient-fire">Kanta</span>tero Hub
          </span>
        </Link>


        <Link
          to="/player"
          className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-glow-red transition-transform hover:scale-105 sm:px-4"
        >
          <Play className="h-4 w-4 fill-current" />
          <span className="hidden sm:inline">Player</span>
          {upcoming > 0 && (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {upcoming}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
