import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, Pause, SkipForward, RotateCcw, Volume2, VolumeX, Maximize, Minimize, Music, Sparkles, Mic2 } from 'lucide-react';
import { QueueItem } from '../types';

interface YouTubePlayerProps {
  currentTrack: QueueItem | null;
  autoplay?: boolean;
  onTrackEnded: () => void;
  onSkipNext: () => void;
  onReplay: () => void;
  remoteCommand?: { command: string; value?: any; timestamp: number } | null;
  onAddSongClick?: () => void;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
  currentTrack,
  autoplay = true,
  onTrackEnded,
  onSkipNext,
  onReplay,
  remoteCommand,
  onAddSongClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(80);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [apiReady, setApiReady] = useState<boolean>(false);
  const controlsTimeoutRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  // Load YouTube IFrame API script
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setApiReady(true);
      return;
    }

    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevReady) prevReady();
      setApiReady(true);
    };

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }, []);

  // Initialize or update YouTube Player instance
  useEffect(() => {
    if (!apiReady || !currentTrack) {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (e) {}
      }
      return;
    }

    const playerContainer = document.getElementById('yt-player-target');
    if (!playerContainer) return;

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player('yt-player-target', {
        videoId: currentTrack.video_id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            event.target.playVideo();
            setIsPlaying(true);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setDuration(playerRef.current?.getDuration() || 0);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              onTrackEnded();
            }
          },
        },
      });
    } else {
      try {
        playerRef.current.loadVideoById(currentTrack.video_id);
        playerRef.current.playVideo();
        setIsPlaying(true);
      } catch (e) {
        console.error('Error loading video in YT Player:', e);
      }
    }
  }, [apiReady, currentTrack?.video_id]);

  // Progress update timer
  useEffect(() => {
    progressIntervalRef.current = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && isPlaying) {
        try {
          const curr = playerRef.current.getCurrentTime();
          const dur = playerRef.current.getDuration();
          if (curr !== undefined) setCurrentTime(curr);
          if (dur !== undefined && dur > 0) setDuration(dur);
        } catch (e) {}
      }
    }, 500);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isPlaying]);

  // Listen to remote commands
  useEffect(() => {
    if (!remoteCommand || !playerRef.current) return;

    try {
      if (remoteCommand.command === 'play') {
        playerRef.current.playVideo();
        setIsPlaying(true);
      } else if (remoteCommand.command === 'pause') {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else if (remoteCommand.command === 'replay') {
        playerRef.current.seekTo(0, true);
        playerRef.current.playVideo();
        setIsPlaying(true);
      } else if (remoteCommand.command === 'skip') {
        onSkipNext();
      } else if (remoteCommand.command === 'volume') {
        const val = Number(remoteCommand.value) || 80;
        playerRef.current.setVolume(val);
        setVolume(val);
      }
    } catch (e) {
      console.warn('Player remote command failed:', e);
    }
  }, [remoteCommand, onSkipNext]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } catch (e) {}
  }, [isPlaying]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(time, true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (playerRef.current && playerRef.current.setVolume) {
      playerRef.current.setVolume(val);
      if (val === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume || 80);
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 4000);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      id="host-video-player-container"
      onMouseMove={handleMouseMove}
      className={`relative w-full h-full min-h-[340px] md:min-h-[460px] lg:min-h-[520px] bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/5 group select-none flex flex-col justify-center items-center ${
        isFullscreen ? 'rounded-none border-none' : ''
      }`}
    >
      {currentTrack ? (
        <>
          {/* YouTube Video Target Frame */}
          <div className="absolute inset-0 w-full h-full pointer-events-none">
            <div id="yt-player-target" className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Top Header Overlay for Track Info */}
          <div
            className={`absolute top-0 inset-x-0 p-4 md:p-6 bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-opacity duration-300 pointer-events-auto flex items-center justify-between ${
              showControls ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3 max-w-[80%]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
                <Mic2 className="w-5 h-5 text-white" />
              </div>
              <div className="truncate">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    NOW SINGING
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Requested by <strong className="text-white font-semibold">{currentTrack.added_by}</strong>
                  </span>
                </div>
                <h2 className="text-base md:text-xl font-black text-white tracking-tight truncate mt-0.5 drop-shadow-md">
                  {currentTrack.title}
                </h2>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 bg-white/5 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide">Live Stage</span>
            </div>
          </div>

          {/* Immersive Floating Bottom Overlay Bar */}
          <div
            className={`absolute bottom-4 sm:bottom-6 left-4 sm:left-6 right-4 sm:right-6 p-3.5 sm:p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 transition-opacity duration-300 pointer-events-auto flex flex-col sm:flex-row items-center justify-between gap-3 ${
              showControls ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
            }`}
          >
            {/* Left Playback & Singer */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5">
                <button
                  id="karaoke-play-pause-btn"
                  onClick={togglePlay}
                  title={isPlaying ? 'Pause' : 'Play'}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 transition-all active:scale-95 cursor-pointer"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  id="karaoke-skip-btn"
                  onClick={onSkipNext}
                  title="Skip to next song"
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  id="karaoke-replay-btn"
                  onClick={onReplay}
                  title="Replay song"
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col text-left sm:ml-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                  Requested by
                </span>
                <span className="text-xs font-semibold text-white truncate max-w-[120px]">
                  {currentTrack.added_by}
                </span>
              </div>
            </div>

            {/* Right: Seek Progress Bar & Fullscreen / Volume */}
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto justify-end">
              {/* Progress Slider */}
              <div className="flex items-center gap-2 flex-1 sm:flex-initial">
                <span className="text-[11px] text-slate-400 font-mono w-9 text-right">
                  {formatTime(currentTime)}
                </span>
                <div className="relative w-full sm:w-36 md:w-48 h-1.5 bg-white/20 rounded-full overflow-hidden flex items-center">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                  <input
                    id="karaoke-progress-slider"
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                </div>
                <span className="text-[11px] text-slate-400 font-mono w-9">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Volume & Fullscreen */}
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleMute}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <button
                  id="karaoke-fullscreen-btn"
                  onClick={toggleFullscreen}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Empty / Stage Standby Visualizer */
        <div className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-900 overflow-hidden">
          {/* Ambient stage glows */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center max-w-md">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
                <Mic2 className="w-10 h-10 text-white animate-pulse" />
              </div>
              <div className="absolute -top-1 -right-1 p-1.5 rounded-full bg-purple-500 text-white shadow-lg animate-bounce">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
            </div>

            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2 drop-shadow-md">
              Stage Ready For You
            </h3>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 leading-relaxed">
              Search and reserve your favorite karaoke track, or scan the QR code to queue songs directly from your phone!
            </p>

            {onAddSongClick && (
              <button
                id="empty-stage-add-song-btn"
                onClick={onAddSongClick}
                className="flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
              >
                <Music className="w-4 h-4" />
                <span>Search & Reserve Song</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
