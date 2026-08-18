import React, { useState } from 'react';
import { Mic2, Volume2, VolumeX, Home, Users } from 'lucide-react';
import { getAudioMuted, setAudioMuted } from '../lib/audioEffects';

interface NavbarProps {
  roomCode?: string;
  roomName?: string;
  isConnected?: boolean;
  onGoHome?: () => void;
  guestCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  roomCode,
  roomName,
  isConnected = true,
  onGoHome,
  guestCount,
}) => {
  const [muted, setMuted] = useState(getAudioMuted());

  const handleToggleMute = () => {
    const next = !muted;
    setAudioMuted(next);
    setMuted(next);
  };

  return (
    <header className="h-16 w-full flex items-center justify-between px-4 sm:px-8 border-b border-white/5 bg-black/20 backdrop-blur-md z-40 sticky top-0 select-none">
      {/* Brand Logo */}
      <div
        onClick={onGoHome}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform shrink-0">
          <Mic2 className="w-5 h-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-lg sm:text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            KANTATERO
          </span>
          <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold -mt-1 hidden sm:block">
            Immersive Karaoke
          </span>
        </div>
      </div>

      {/* Room Details if active */}
      {roomCode && (
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Room Code
            </span>
            <span className="text-base sm:text-xl font-mono font-bold text-indigo-400 tracking-wider">
              {roomCode}
            </span>
          </div>

          <div className="hidden md:block h-7 w-[1px] bg-white/10" />

          <div className="hidden sm:flex items-center gap-2.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-medium text-slate-300">
              {guestCount !== undefined ? `${guestCount} Guests Online` : 'Live Host'}
            </span>
          </div>
        </div>
      )}

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sound Effects Toggle */}
        <button
          id="toggle-fx-mute-btn"
          onClick={handleToggleMute}
          title={muted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-medium"
        >
          {muted ? (
            <VolumeX className="w-4 h-4 text-red-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-indigo-400" />
          )}
          <span className="hidden md:inline text-[11px]">{muted ? 'FX Off' : 'FX On'}</span>
        </button>

        {onGoHome && roomCode && (
          <button
            id="nav-home-btn"
            onClick={onGoHome}
            title="Return to Lobby"
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer text-xs flex items-center gap-1.5 font-medium"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">Lobby</span>
          </button>
        )}
      </div>
    </header>
  );
};
