import React, { useState } from 'react';
import { Play, Pause, SkipForward, RotateCcw } from 'lucide-react';
import { CheerType } from '../types';

interface RemoteControlsProps {
  isPlaying: boolean;
  canSkip?: boolean;
  onPlayPause: (playing: boolean) => void;
  onSkip: () => void;
  onReplay: () => void;
  onSendCheer: (type: CheerType) => void;
}

export const RemoteControls: React.FC<RemoteControlsProps> = ({
  isPlaying,
  canSkip = true,
  onPlayPause,
  onSkip,
  onReplay,
  onSendCheer,
}) => {
  const [activeCheer, setActiveCheer] = useState<string | null>(null);

  const handleCheerClick = (type: CheerType) => {
    setActiveCheer(type);
    onSendCheer(type);
    setTimeout(() => setActiveCheer(null), 800);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3.5 sm:p-4 bg-black/70 backdrop-blur-2xl border-t border-white/10 shadow-2xl flex flex-col gap-3 max-w-xl mx-auto rounded-t-3xl select-none">
      {/* 1. Cheer Soundboard Horizontal Bar */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          onClick={() => handleCheerClick('airhorn')}
          className={`flex-1 min-w-[52px] py-1.5 px-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-black flex flex-col items-center gap-0.5 transition-transform cursor-pointer ${
            activeCheer === 'airhorn' ? 'scale-110 ring-2 ring-indigo-400 bg-indigo-500/20' : 'active:scale-95'
          }`}
        >
          <span className="text-lg">📢</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Horn</span>
        </button>

        <button
          onClick={() => handleCheerClick('applause')}
          className={`flex-1 min-w-[52px] py-1.5 px-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-transform cursor-pointer ${
            activeCheer === 'applause' ? 'scale-110 ring-2 ring-amber-400 bg-amber-500/20' : 'active:scale-95'
          }`}
        >
          <span className="text-lg">👏</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Clap</span>
        </button>

        <button
          onClick={() => handleCheerClick('cheer')}
          className={`flex-1 min-w-[52px] py-1.5 px-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-transform cursor-pointer ${
            activeCheer === 'cheer' ? 'scale-110 ring-2 ring-purple-400 bg-purple-500/20' : 'active:scale-95'
          }`}
        >
          <span className="text-lg">🎉</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Cheer</span>
        </button>

        <button
          onClick={() => handleCheerClick('fire')}
          className={`flex-1 min-w-[52px] py-1.5 px-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-transform cursor-pointer ${
            activeCheer === 'fire' ? 'scale-110 ring-2 ring-orange-400 bg-orange-500/20' : 'active:scale-95'
          }`}
        >
          <span className="text-lg">🔥</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Fire</span>
        </button>

        <button
          onClick={() => handleCheerClick('heart')}
          className={`flex-1 min-w-[52px] py-1.5 px-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-bold flex flex-col items-center gap-0.5 transition-transform cursor-pointer ${
            activeCheer === 'heart' ? 'scale-110 ring-2 ring-pink-400 bg-pink-500/20' : 'active:scale-95'
          }`}
        >
          <span className="text-lg">💖</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Love</span>
        </button>

        <button
          onClick={() => handleCheerClick('mic_drop')}
          className={`flex-1 min-w-[52px] py-1.5 px-2 rounded-2xl bg-white/[0.03] hover:bg-white/10 border border-white/10 text-[11px] font-black flex flex-col items-center gap-0.5 transition-transform cursor-pointer ${
            activeCheer === 'mic_drop' ? 'scale-110 ring-2 ring-indigo-400 bg-indigo-500/20' : 'active:scale-95'
          }`}
        >
          <span className="text-lg">🎤</span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Drop</span>
        </button>
      </div>

      {/* 2. Media Playback Controls */}
      <div className="flex items-center justify-around gap-2.5 pt-1.5 border-t border-white/5">
        {/* Replay */}
        <button
          id="remote-replay-btn"
          onClick={onReplay}
          className="flex-1 py-3 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
          <span>Replay</span>
        </button>

        {/* Play/Pause */}
        <button
          id="remote-play-pause-btn"
          onClick={() => onPlayPause(!isPlaying)}
          className="flex-1.5 py-3.5 px-5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white flex items-center justify-center gap-2 text-xs sm:text-sm font-black shadow-xl shadow-indigo-500/25 transition-all active:scale-95 cursor-pointer"
        >
          {isPlaying ? (
            <>
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause TV</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Play TV</span>
            </>
          )}
        </button>

        {/* Skip Next */}
        <button
          id="remote-skip-btn"
          onClick={onSkip}
          disabled={!canSkip}
          title={!canSkip ? 'Host disabled guest skip in room settings' : 'Skip track'}
          className={`flex-1 py-3 px-3 rounded-2xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all cursor-pointer shadow-md ${
            canSkip
              ? 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 active:scale-95'
              : 'bg-white/[0.02] text-slate-600 border-white/5 cursor-not-allowed opacity-50'
          }`}
        >
          <SkipForward className="w-3.5 h-3.5 text-purple-400" />
          <span>Next</span>
        </button>
      </div>
    </div>
  );
};
