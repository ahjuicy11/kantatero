import { useEffect, useMemo, useRef, useState } from "react";
import YouTube, { type YouTubeEvent, type YouTubePlayer } from "react-youtube";
import { useKaraoke } from "@/stores/karaoke-store";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize, Repeat, ListMusic, RotateCcw, Radio, Music, Music2, Music4, Mic2, User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Player({ fill = false }: { fill?: boolean } = {}) {
  const queue = useKaraoke((s) => s.queue);
  const currentIndex = useKaraoke((s) => s.currentIndex);
  const advance = useKaraoke((s) => s.advance);
  const previous = useKaraoke((s) => s.previous);
  const autoNext = useKaraoke((s) => s.autoNext);
  const toggleAutoNext = useKaraoke((s) => s.toggleAutoNext);
  const pushHistory = useKaraoke((s) => s.pushHistory);
  const showTicker = useKaraoke((s) => s.showTicker);
  const tickerMode = useKaraoke((s) => s.tickerMode);


  const current = currentIndex >= 0 ? queue[currentIndex] : queue[0];
  const nextIndex = currentIndex >= 0 ? currentIndex + 1 : queue.length > 0 ? 1 : -1;
  const next = nextIndex >= 0 ? queue[nextIndex] : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [rate, setRate] = useState(1);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [upNextVisible, setUpNextVisible] = useState(false);
  const [upNextReason, setUpNextReason] = useState<"start" | "end">("start");
  const [upNextStart, setUpNextStart] = useState(0);
  const [upNextTotal, setUpNextTotal] = useState(6);
  const [upNextProgress, setUpNextProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [reserveToast, setReserveToast] = useState<{ id: number; title: string; by: string } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pseudoFullscreen, setPseudoFullscreen] = useState(false);
  const [needsTap, setNeedsTap] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const playbackAttemptRef = useRef(0);
  const previousVideoIdRef = useRef<string | null>(null);
  const currentVideoIdRef = useRef<string | null>(current?.id ?? null);
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  const rateRef = useRef(rate);

  currentVideoIdRef.current = current?.id ?? null;
  volumeRef.current = volume;
  mutedRef.current = muted;
  rateRef.current = rate;

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);


  // Track hosted room code (shown as overlay so it's visible in fullscreen)
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("karaoke.hosted-room");
        setRoomCode(raw ? (JSON.parse(raw)?.code ?? null) : null);
      } catch {
        setRoomCode(null);
      }
    };
    read();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "karaoke.hosted-room") read();
    };
    window.addEventListener("storage", onStorage);
    const iv = window.setInterval(read, 2000);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.clearInterval(iv);
    };
  }, []);

  // If nothing currently playing but queue has items, auto-start first
  useEffect(() => {
    if (currentIndex < 0 && queue.length > 0) {
      useKaraoke.getState().setCurrentIndex(0);
    }
  }, [currentIndex, queue.length]);

  useEffect(() => {
    if (current) pushHistory(current);
  }, [current?.id]);

  // Reset "Up Next" overlay whenever the current song changes; it will
  // re-appear only during the last 15 seconds (see poll below).
  useEffect(() => {
    setUpNextVisible(false);
    setUpNextReason("start");
    setUpNextProgress(0);
  }, [current?.id]);

  // Poll for near-end of current song and re-show "Up Next" overlay
  useEffect(() => {
    if (!isPlaying || !next) return;
    let armed = false;
    const iv = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const dur = p.getDuration?.() ?? 0;
        const cur = p.getCurrentTime?.() ?? 0;
        if (dur > 0 && dur - cur <= 15 && dur - cur > 0) {
          if (!armed) {
            armed = true;
            setUpNextTotal(Math.max(1, dur - cur));
            setUpNextStart(Date.now());
            setUpNextReason("end");
            setUpNextVisible(true);
          }
        }
      } catch { /* ignore */ }
    }, 1000);
    return () => window.clearInterval(iv);
  }, [isPlaying, next?.queueId, current?.id]);

  // Animate circular cooldown progress
  useEffect(() => {
    if (!upNextVisible) { setUpNextProgress(0); return; }
    let raf = 0;
    const tick = () => {
      const p = Math.min(1, (Date.now() - upNextStart) / (upNextTotal * 1000));
      setUpNextProgress(p);
      if (p < 1 && upNextVisible) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [upNextVisible, upNextStart, upNextTotal]);

  // Smoothly track elapsed/duration via rAF, resyncing periodically from the iframe
  const seekingRef = useRef(false);
  useEffect(() => {
    let raf = 0;
    let lastSample = 0;
    let lastSampleAt = performance.now();
    let lastResync = 0;

    const readNow = () => {
      const p = playerRef.current;
      if (!p) return;
      try {
        const cur = p.getCurrentTime?.() ?? 0;
        const dur = p.getDuration?.() ?? 0;
        lastSample = cur;
        lastSampleAt = performance.now();
        if (dur && dur !== duration) setDuration(dur);
        if (!seekingRef.current) setElapsed(cur);
      } catch { /* ignore */ }
    };
    readNow();

    const tick = (t: number) => {
      const p = playerRef.current;
      if (p) {
        // Resync from the player every ~500ms to correct drift
        if (t - lastResync > 500) {
          lastResync = t;
          try {
            const dur = p.getDuration?.() ?? 0;
            if (dur) setDuration((d) => (Math.abs(d - dur) > 0.5 ? dur : d));
            const cur = p.getCurrentTime?.() ?? 0;
            lastSample = cur;
            lastSampleAt = t;
            if (!seekingRef.current) setElapsed(cur);
          } catch { /* ignore */ }
        } else if (isPlayingRef.current && !seekingRef.current) {
          const rate = (() => { try { return p.getPlaybackRate?.() ?? 1; } catch { return 1; } })();
          const est = lastSample + ((t - lastSampleAt) / 1000) * rate;
          setElapsed(est);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const formatTime = (s: number) => {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };


  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      if (e.code === "ArrowRight") advance();
      if (e.code === "ArrowLeft") previous();
      if (e.key === "m") setMuted((m) => !m);
      if (e.key === "f") enterFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remote (phone) playback commands from the hosted room
  useEffect(() => {
    const onCmd = (e: Event) => {
      const detail = (e as CustomEvent).detail as { command: string; payload?: { seconds?: number } | null };
      const p = playerRef.current;
      switch (detail.command) {
        case "play": void startPlayback("remote"); break;
        case "pause": p?.pauseVideo(); break;
        case "next": advance(); break;
        case "prev": previous(); break;
        case "restart": p?.seekTo(0, true); void startPlayback("remote"); break;
        case "seek":
          if (typeof detail.payload?.seconds === "number") p?.seekTo(detail.payload.seconds, true);
          break;
      }
    };
    window.addEventListener("karaoke:remote-cmd", onCmd);
    return () => window.removeEventListener("karaoke:remote-cmd", onCmd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reservation flash notification
  useEffect(() => {
    let timer: number | undefined;
    const onReserved = (e: Event) => {
      const detail = (e as CustomEvent).detail as { title: string; by: string };
      setReserveToast({ id: Date.now(), title: detail.title, by: detail.by });
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setReserveToast(null), 4000);
    };
    window.addEventListener("karaoke:reserved", onReserved);
    return () => {
      window.removeEventListener("karaoke:reserved", onReserved);
      window.clearTimeout(timer);
    };
  }, []);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) p.pauseVideo();
    else void startPlayback("gesture");
  };

  const revealControls = () => {
    setShowControls(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      // Only auto-hide while playing; when paused keep controls visible.
      if (isPlayingRef.current) setShowControls(false);
    }, 2600);
  };
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  useEffect(() => {
    if (!isPlaying) setShowControls(true);
    else revealControls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => () => { if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current); }, []);

  const enterFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    // Exit if already fullscreen (native or pseudo)
    if (document.fullscreenElement || pseudoFullscreen) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (screen.orientation as any)?.unlock?.();
      } catch { /* ignore */ }
      if (document.fullscreenElement) {
        try { await document.exitFullscreen(); } catch { /* ignore */ }
      }
      setPseudoFullscreen(false);
      return;
    }
    // Try native fullscreen APIs (incl. iPad webkit prefix)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyEl = el as any;
    const req =
      el.requestFullscreen ||
      anyEl.webkitRequestFullscreen ||
      anyEl.webkitRequestFullScreen ||
      anyEl.msRequestFullscreen;
    if (req) {
      try {
        await req.call(el);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (screen.orientation as any)?.lock?.("landscape").catch(() => {});
        return;
      } catch { /* fall through to pseudo */ }
    }
    // iPhone Safari and other browsers without element fullscreen — use CSS
    setPseudoFullscreen(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (screen.orientation as any)?.lock?.("landscape").catch(() => {});
  };

  // Sync pseudo-fullscreen with Esc / browser back
  useEffect(() => {
    if (!pseudoFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPseudoFullscreen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [pseudoFullscreen]);

  const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

  const getPlayerState = async (p: YouTubePlayer) => {
    try {
      const state = await p.getPlayerState?.();
      return typeof state === "number" ? state : null;
    } catch {
      return null;
    }
  };

  const applyPlaybackSettings = async (p: YouTubePlayer) => {
    try {
      if (mutedRef.current) await p.mute?.();
      else await p.unMute?.();
      await p.setVolume?.(mutedRef.current ? 0 : volumeRef.current);
      await p.setPlaybackRate?.(rateRef.current);
    } catch { /* ignore */ }
  };

  // YouTube re-enables captions per video when the viewer's account defaults to
  // them, so unload the captions modules after every load and on state changes.
  const disableCaptions = (p: YouTubePlayer | null | undefined) => {
    if (!p) return;
    const api = p as unknown as {
      unloadModule?: (name: string) => void;
      setOption?: (module: string, option: string, value: unknown) => void;
    };
    try {
      api.setOption?.("captions", "track", {});
      api.setOption?.("cc", "track", {});
      api.unloadModule?.("captions");
      api.unloadModule?.("cc");
    } catch { /* noop */ }
  };

  const loadCurrentVideo = async (p: YouTubePlayer, videoId: string) => {
    try {
      await p.loadVideoById?.({ videoId });
    } catch {
      try { await p.loadVideoById?.(videoId); } catch { /* ignore */ }
    }
    disableCaptions(p);
    setTimeout(() => disableCaptions(p), 1200);
  };

  const startPlayback = async (_source: "autoplay" | "gesture" | "remote" = "autoplay") => {
    const p = playerRef.current;
    if (!p || !currentVideoIdRef.current) return false;

    const attempt = ++playbackAttemptRef.current;
    setNeedsTap(false);

    // iOS requires media playback to be triggered directly inside the tap stack.
    // Do not await volume/rate calls before the first playVideo() for gestures.
    if (_source === "gesture") {
      try {
        if (mutedRef.current) void p.mute?.();
        else void p.unMute?.();
        void p.setVolume?.(mutedRef.current ? 0 : volumeRef.current);
        void p.playVideo?.();
      } catch { /* ignore */ }
    }

    await applyPlaybackSettings(p);

    for (const waitMs of [0, 300, 900, 1600]) {
      if (waitMs) await delay(waitMs);
      if (attempt !== playbackAttemptRef.current) return false;

      try { await p.playVideo?.(); } catch { /* ignore */ }
      await delay(250);

      const state = await getPlayerState(p);
      // 1 = playing, 3 = buffering and about to play.
      if (state === 1 || state === 3) {
        setNeedsTap(false);
        return true;
      }
    }

    if (attempt === playbackAttemptRef.current) setNeedsTap(true);
    return false;
  };

  const onReady = (e: YouTubeEvent) => {
    playerRef.current = e.target;
    // Force-disable built-in captions/subtitles regardless of user account defaults.
    disableCaptions(e.target);
    void applyPlaybackSettings(e.target);
    if (currentVideoIdRef.current) {
      void loadCurrentVideo(e.target, currentVideoIdRef.current).then(() => startPlayback("autoplay"));
    }
  };


  const onStateChange = (e: YouTubeEvent<number>) => {
    // 1 = playing, 2 = paused, 0 = ended
    if (e.data === 1) { setIsPlaying(true); setNeedsTap(false); disableCaptions(e.target); }
    if (e.data === 2) setIsPlaying(false);
    if (e.data === 0) {
      setIsPlaying(false);
      if (autoNext) advance();
    }
  };

  // When song changes, keep the same YouTube iframe and retry until iOS either starts
  // playback or asks for one direct tap. Reusing the iframe lets later songs continue.
  useEffect(() => {
    const videoId = current?.id ?? null;
    playbackAttemptRef.current += 1;
    setNeedsTap(false);
    if (!videoId) {
      previousVideoIdRef.current = null;
      setIsPlaying(false);
      return;
    }

    const p = playerRef.current;
    const repeatedVideo = previousVideoIdRef.current === videoId;
    previousVideoIdRef.current = videoId;

    const timer = window.setTimeout(() => {
      if (currentVideoIdRef.current !== videoId) return;
      if (repeatedVideo) {
        try { p?.seekTo(0, true); } catch { /* ignore */ }
      } else if (p) {
        void loadCurrentVideo(p, videoId).then(() => startPlayback("autoplay"));
        return;
      }
      void startPlayback("autoplay");
    }, 350);

    return () => window.clearTimeout(timer);
  }, [current?.queueId, current?.id]);


  useEffect(() => { playerRef.current?.setVolume(muted ? 0 : volume); }, [volume, muted]);
  useEffect(() => { playerRef.current?.setPlaybackRate(rate); }, [rate]);

  if (!current) {
    return <EmptyStage fill={fill} />;
  }

  return (
    <div className={fill ? "flex h-full min-h-0 flex-col" : ""}>
      <div
        ref={containerRef}
        onMouseMove={revealControls}
        onMouseEnter={revealControls}
        onTouchStart={revealControls}
        onMouseLeave={() => { if (isPlayingRef.current) setShowControls(false); }}
        className={
          isFullscreen || pseudoFullscreen
            ? "group fixed inset-0 z-[9999] h-screen w-screen overflow-hidden bg-black"
            : fill
            ? "group relative aspect-video w-full overflow-hidden rounded-3xl border border-white/5 bg-black shadow-glow-red landscape:max-lg:aspect-auto landscape:max-lg:min-h-0 landscape:max-lg:flex-1 lg:aspect-auto lg:min-h-0 lg:flex-1"
            : "group relative aspect-video w-full overflow-hidden rounded-3xl border border-white/5 bg-black shadow-glow-red"
        }
      >
        <YouTube
          videoId=""
          className="pointer-events-none absolute inset-0 h-full w-full"
          iframeClassName="pointer-events-none h-full w-full"
          title={current.title}
          opts={{
            width: "100%",
            height: "100%",
            playerVars: {
              autoplay: 1,
              playsinline: 1,
              enablejsapi: 1,
              origin: typeof window !== "undefined" ? window.location.origin : undefined,
              modestbranding: 1,
              rel: 0,
              cc_load_policy: 0,
              cc_lang_pref: "none",

              controls: 0,
              disablekb: 1,
              iv_load_policy: 3,
              fs: 0,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={() => advance()}
        />
        {/* Top mask — hides YouTube's title bar / any residual chrome on load or pause. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-black/70 to-transparent" />
        {/* iOS tap-to-play overlay — appears when autoplay is blocked */}
        {needsTap && (
          <button
            onClick={() => void startPlayback("gesture")}
            className="absolute inset-0 z-30 grid place-items-center bg-black/70 backdrop-blur-sm"
            aria-label="Tap to play"
          >
            <span className="flex flex-col items-center gap-3">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow-red">
                <Play className="h-9 w-9 fill-current" />
              </span>
              <span className="text-sm font-semibold uppercase tracking-[0.25em] text-white/90">Tap to play</span>
            </span>
          </button>
        )}
        {/* Top row: join code + reserved-songs ticker — visible in fullscreen */}
        {(roomCode || ((showTicker || tickerMode === "next") && (currentIndex >= 0 ? queue.length - currentIndex - 1 > 0 : queue.length > 1))) && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-[15] flex items-center gap-3 px-3 py-2">
            {roomCode && (
              <div className="flex shrink-0 items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs backdrop-blur">
                <Radio className="h-3.5 w-3.5 text-primary" />
                <span className="text-white/60">Join code</span>
                <span className="font-display text-sm font-black tracking-[0.3em] text-gradient-fire">
                  {roomCode}
                </span>
              </div>
            )}
            {(showTicker || tickerMode === "next") && (
              <ReservedTicker
                items={(() => {
                  const upcoming = currentIndex >= 0 ? queue.slice(currentIndex + 1) : queue.slice(1);
                  return tickerMode === "next" ? upcoming.slice(0, 1) : upcoming;
                })()}
                labelOverride={tickerMode === "next" ? "Up Next:" : undefined}
              />
            )}
          </div>
        )}





        {/* Reservation flash — top center */}
        <AnimatePresence>
          {reserveToast && (
            <motion.div
              key={reserveToast.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute left-1/2 top-14 z-20 -translate-x-1/2 sm:top-16"
            >
              <div className="glass-strong flex max-w-[86vw] items-center gap-2 rounded-full border border-gold/40 px-4 py-2 shadow-glow-red">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gold/20 text-gold">
                  <User className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-xs font-semibold text-white">
                  <span className="text-gold">{reserveToast.by}</span>
                  <span className="text-white/60"> reserved </span>
                  <span className="text-white">{reserveToast.title}</span>
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Up Next overlay — circular badge with progress ring, centered */}
        <AnimatePresence>
          {next && upNextVisible && (
            <motion.div
              key={`${next.queueId}-${upNextReason}`}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.35 }}
              className="pointer-events-none absolute inset-0 z-10 grid place-items-center"
            >
              <div className="relative flex h-56 w-56 items-center justify-center landscape:max-lg:h-40 landscape:max-lg:w-40 sm:h-64 sm:w-64 lg:h-72 lg:w-72">
                {/* Circular progress ring */}
                <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="47"
                    fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="50" cy="50" r="47"
                    fill="none"
                    stroke="#FF0000"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 47}
                    strokeDashoffset={2 * Math.PI * 47 * (1 - upNextProgress)}
                  />
                </svg>
                {/* Inner disc */}
                <div className="flex h-[88%] w-[88%] flex-col items-center justify-center rounded-full border border-white/10 bg-black/85 px-4 text-center backdrop-blur-md">
                  <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 sm:text-[11px]">
                    <SkipForward className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    {upNextReason === "end" ? "Coming Up" : "Up Next"}
                  </div>
                  <div className="mt-1.5 line-clamp-2 text-[13px] font-bold leading-tight text-white sm:text-sm lg:text-base">
                    {next.title}
                  </div>
                  <div className="mt-1 line-clamp-1 w-full text-[11px] text-white/60 sm:text-xs">{next.artist}</div>
                  {next.reservedBy && (
                    <div className="mt-1.5 flex max-w-full items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/85 sm:text-[11px]">
                      <User className="h-2.5 w-2.5 shrink-0 text-white/70" />
                      <span className="truncate font-medium">{next.reservedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Click-to-toggle play/pause layer — sits above the iframe but below controls/overlays */}
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 z-[5] h-full w-full cursor-pointer bg-transparent"
          aria-label={isPlaying ? "Pause" : "Play"}
        />

        {/* Custom control overlay — replaces YouTube's built-in controls */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pb-3 pt-8 transition-opacity duration-300 sm:px-5 sm:pt-10 ${
            showControls ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="pointer-events-auto flex min-w-0 items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold text-white sm:text-base">{current.title}</div>
              <div className="truncate text-[11px] text-white/60 sm:text-xs">
                {current.artist} • {current.channel}
              </div>
            </div>
            <div className="shrink-0 font-mono text-[11px] tabular-nums text-white/85 sm:text-xs">
              <span className="text-gradient-fire font-semibold">{formatTime(elapsed)}</span>
              <span className="mx-1 text-white/40">/</span>
              <span className="text-white/70">{formatTime(duration)}</span>
            </div>
          </div>
          {/* Seek bar */}
          <div className="pointer-events-auto flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={Math.max(1, duration || 1)}
              step="any"
              value={Math.min(elapsed, Math.max(1, duration || 1))}
              onPointerDown={() => { seekingRef.current = true; }}
              onChange={(e) => {
                const s = Number(e.target.value);
                setElapsed(s);
              }}
              onPointerUp={(e) => {
                const s = Number((e.target as HTMLInputElement).value);
                try { playerRef.current?.seekTo(s, true); } catch { /* ignore */ }
                seekingRef.current = false;
              }}
              onKeyUp={(e) => {
                const s = Number((e.target as HTMLInputElement).value);
                try { playerRef.current?.seekTo(s, true); } catch { /* ignore */ }
              }}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 [accent-color:#ef4444]"
              style={{
                background: duration > 0
                  ? `linear-gradient(to right, #ef4444 0%, #ef4444 ${(elapsed / duration) * 100}%, rgba(255,255,255,0.15) ${(elapsed / duration) * 100}%, rgba(255,255,255,0.15) 100%)`
                  : undefined,
              }}
              aria-label="Seek"
            />
          </div>

          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button onClick={previous} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Previous">
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={togglePlay}
                className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow-red transition hover:scale-105"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </button>
              <button onClick={advance} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="Next">
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                onClick={() => playerRef.current?.seekTo(0, true)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Restart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMuted((m) => !m)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Mute"
              >
                {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={muted ? 0 : volume}
                onChange={(e) => { setMuted(false); setVolume(Number(e.target.value)); }}
                className="hidden h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/15 accent-primary sm:block"
                aria-label="Volume"
              />
              <select
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="rounded-full bg-white/10 px-2.5 py-1.5 text-[11px] text-white outline-none hover:bg-white/20"
              >
                {[0.5, 0.75, 1, 1.25, 1.5].map((r) => (
                  <option key={r} value={r} className="bg-background">{r}x</option>
                ))}
              </select>
              <button
                onClick={toggleAutoNext}
                className={`grid h-9 w-9 place-items-center rounded-full transition ${
                  autoNext ? "bg-primary/25 text-primary shadow-glow-red" : "bg-white/10 text-white/80 hover:bg-white/20"
                }`}
                aria-label="Auto next"
                aria-pressed={autoNext}
                title={autoNext ? "Autoplay next: on" : "Autoplay next: off"}
              >
                <Repeat className="h-4 w-4" />
              </button>
              <button
                onClick={enterFullscreen}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                aria-label="Fullscreen"
              >
                <Maximize className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

/** Themed empty stage shown when no song is playing. */
function EmptyStage({ fill = false }: { fill?: boolean } = {}) {
  const notes = useMemo(() => {
    const Icons = [Music, Music2, Music4, Mic2];
    return Array.from({ length: 14 }).map((_, i) => ({
      Icon: Icons[i % Icons.length],
      left: Math.random() * 90 + 5,
      size: 14 + Math.random() * 22,
      delay: Math.random() * 6,
      duration: 6 + Math.random() * 5,
      hue: i % 3 === 0 ? "text-gold" : "text-primary",
      opacity: 0.35 + Math.random() * 0.45,
    }));
  }, []);

  return (
    <div className={`relative w-full overflow-hidden rounded-3xl border border-white/5 bg-black shadow-glow-red ${fill ? "h-full min-h-0 flex-1" : "aspect-video"}`}>
      {/* Backdrop glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,theme(colors.red.900/0.35),transparent_60%)]" />
        <div className="absolute -left-24 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
      </div>

      {/* Floating notes */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {notes.map((n, i) => {
          const Icon = n.Icon;
          return (
            <span
              key={i}
              className={`float-note absolute bottom-0 ${n.hue}`}
              style={{
                left: `${n.left}%`,
                opacity: n.opacity,
                animationDelay: `${n.delay}s`,
                animationDuration: `${n.duration}s`,
              }}
            >
              <Icon style={{ width: n.size, height: n.size }} />
            </span>
          );
        })}
      </div>

      {/* Equalizer bars */}
      <div className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-end gap-1.5">
        {[0.1, 0.25, 0.15, 0.35, 0.05, 0.3, 0.2].map((d, i) => (
          <span
            key={i}
            className="eq-bar block w-1.5 rounded-full bg-gradient-to-t from-primary to-gold"
            style={{ height: 32 + (i % 3) * 12, animationDelay: `${d}s` }}
          />
        ))}
      </div>

      {/* Center brand */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/20 ring-1 ring-primary/40 backdrop-blur"
        >
          <Mic2 className="h-8 w-8 text-primary" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mt-5 font-display text-3xl font-black tracking-tight sm:text-4xl"
        >
          <span className="text-gradient-fire">Kanta</span>
          <span className="text-white/90">tero Hub</span>
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-2 max-w-sm text-sm text-white/60"
        >
          The stage is warm. Search a song and reserve it to light it up.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-white/60 ring-1 ring-white/10"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
          BY: TENG
        </motion.div>
      </div>
    </div>
  );
}

type TickerItem = { queueId: string; title: string; artist?: string; reservedBy?: string };

function ReservedTicker({ items, labelOverride }: { items: TickerItem[]; labelOverride?: string }) {
  const speed = useKaraoke((s) => s.tickerSpeed);
  const reduced = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  const listRef = useRef<HTMLDivElement | null>(null);
  const [duration, setDuration] = useState(30);

  // Measure the (single) list width and derive a duration that keeps a
  // constant pixel speed regardless of how many songs are queued.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.scrollWidth || el.getBoundingClientRect().width || 0;
      if (w > 0) setDuration(Math.max(10, Math.round(w / Math.max(5, speed))));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [items, speed]);


  if (!items.length) {
    return <div className="min-w-0 flex-1" />;
  }

  const Chip = ({ item, i }: { item: TickerItem; i: number }) => (
    <span className="mx-2 inline-flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs">
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/25 text-[10px] font-bold text-primary">
        {i + 1}
      </span>
      <span className="font-semibold text-white/90">{item.title}</span>
      {item.artist && <span className="text-white/50">— {item.artist}</span>}
      {item.reservedBy && (
        <span className="inline-flex items-center gap-1 text-gold">
          <User className="h-3 w-3" />
          {item.reservedBy}
        </span>
      )}
    </span>
  );

  const List = ({ innerRef }: { innerRef?: React.Ref<HTMLDivElement> }) => (
    <div ref={innerRef} className="flex shrink-0 items-center whitespace-nowrap">
      {items.map((it, i) => (
        <Chip key={`${it.queueId}-${i}`} item={it} i={i} />
      ))}
    </div>
  );

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span className="shrink-0 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-gold backdrop-blur">
        {labelOverride ?? "Reserved:"}
      </span>
      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, black 40px, black calc(100% - 60px), transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, black 40px, black calc(100% - 60px), transparent 100%)",
        }}
      >
        {reduced ? (
          <div className="flex items-center"><List /></div>
        ) : (
          <div
            className="flex w-max items-center kt-marquee"
            style={{
              animationDuration: `${duration}s`,
              willChange: "transform",
            }}
          >
            <List innerRef={listRef} />
            <List />
          </div>
        )}
      </div>
    </div>
  );
}


