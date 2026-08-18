import React, { useState } from 'react';
import { Search, Music, Plus, User, AlertCircle, Sparkles, Disc3 } from 'lucide-react';
import { useRoomRealtime } from '../hooks/useRoomRealtime';
import { Navbar } from '../components/Navbar';
import { RemoteControls } from '../components/RemoteControls';
import { QueueList } from '../components/QueueList';
import { AddSongPanel } from '../components/AddSongPanel';
import { CheerOverlay } from '../components/CheerOverlay';
import { QueueItem } from '../types';

interface RemoteViewProps {
  roomCode: string;
  initialGuestName?: string;
  onGoHome: () => void;
}

export const RemoteView: React.FC<RemoteViewProps> = ({
  roomCode,
  initialGuestName = 'Singer',
  onGoHome,
}) => {
  const [guestName, setGuestName] = useState(initialGuestName);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const {
    room,
    queue,
    guests,
    currentTrack,
    isConnected,
    recentCheers,
    errorMessage,
    addToQueue,
    skipTrack,
    replayTrack,
    playPause,
    removeFromQueue,
    sendCheer,
  } = useRoomRealtime({
    roomCode,
    role: 'remote',
    guestName,
    onRoomEnded: onGoHome,
  });

  const queuedSongs = queue.filter((q) => q.status === 'queued');
  const userSongsCount = queue.filter(
    (q) => q.added_by.toLowerCase() === guestName.toLowerCase() && q.status !== 'played'
  ).length;
  const maxSongs = room?.settings.max_songs_per_guest ?? 10;
  const canSkip = room?.settings.allow_guest_skip ?? false;

  const handleReserveTrack = (track: Omit<QueueItem, 'id' | 'room_code' | 'created_at' | 'status'>) => {
    addToQueue({
      ...track,
      added_by: guestName,
    });
    setIsSearchModalOpen(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-slate-50 font-sans pb-36 select-none relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Ambient Immersive Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Cheers */}
      <CheerOverlay cheers={recentCheers} />

      {/* Navbar Header */}
      <Navbar
        roomCode={roomCode}
        roomName={room?.name}
        isConnected={isConnected}
        onGoHome={onGoHome}
        guestCount={guests.length}
      />

      {/* Error alert banner */}
      {errorMessage && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-center text-xs text-red-300 flex items-center justify-center gap-2 relative z-20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      <main className="flex-1 max-w-lg mx-auto w-full px-4 pt-4 space-y-4 relative z-10">
        {/* 1. Guest Identity Header */}
        <div className="flex items-center justify-between p-3.5 rounded-3xl bg-white/[0.03] border border-white/5 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                Singer Profile
              </span>
              <input
                id="remote-guest-name-input"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                maxLength={20}
                className="bg-transparent font-bold text-xs text-white focus:outline-none focus:text-indigo-300"
              />
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
              Your Songs
            </span>
            <span className="text-xs font-mono font-bold text-indigo-400">
              {userSongsCount} / {maxSongs}
            </span>
          </div>
        </div>

        {/* 2. Now Playing Banner */}
        <div className="relative overflow-hidden p-4 rounded-3xl bg-zinc-900 border border-white/5 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
                Playing On TV
              </span>
            </div>

            {currentTrack && (
              <span className="text-[11px] text-slate-400">
                by <strong className="text-white font-semibold">{currentTrack.added_by}</strong>
              </span>
            )}
          </div>

          {currentTrack ? (
            <div className="flex items-center gap-3.5">
              <img
                src={currentTrack.thumbnail_url}
                alt={currentTrack.title}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover border border-white/10 shadow-lg shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-black text-white truncate leading-snug">
                  {currentTrack.title}
                </h3>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {currentTrack.channel_title}
                </p>

                {/* Animated Bars */}
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-indigo-400 animate-pulse"
                      style={{
                        height: `${6 + (i % 3) * 4}px`,
                        animationDelay: `${i * 120}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center">
              <Disc3 className="w-8 h-8 text-slate-600 mx-auto mb-1 animate-spin" />
              <p className="text-xs font-semibold text-slate-400">No song currently singing</p>
              <p className="text-[11px] text-slate-500">Tap below to reserve the next track!</p>
            </div>
          )}
        </div>

        {/* 3. Search & Reserve Trigger Card */}
        <button
          id="remote-open-search-btn"
          onClick={() => setIsSearchModalOpen(true)}
          className="w-full p-4 rounded-3xl bg-white/[0.03] hover:bg-white/5 border border-white/5 hover:border-white/10 flex items-center justify-between text-left transition-all active:scale-[0.99] cursor-pointer shadow-xl group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                Search & Reserve Songs
              </h4>
              <p className="text-xs text-slate-400">
                Browse YouTube karaoke tracks by artist or title
              </p>
            </div>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Plus className="w-4 h-4" />
          </div>
        </button>

        {/* 4. Synced Upcoming Queue */}
        <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5 shadow-xl">
          <QueueList
            queue={queue}
            currentTrackId={room?.current_track_id}
            onRemove={(id) => removeFromQueue(id, guestName)}
            isHost={false}
            currentUser={guestName}
          />
        </div>
      </main>

      {/* Search & Reserve Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end sm:justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg mx-auto bg-zinc-900 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Music className="w-4 h-4 text-indigo-400" />
                <span>Search & Reserve Track</span>
              </h3>
              <button
                id="close-search-modal-btn"
                onClick={() => setIsSearchModalOpen(false)}
                className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold cursor-pointer"
              >
                Close ✕
              </button>
            </div>

            <div className="flex-1 overflow-hidden">
              <AddSongPanel
                onReserve={handleReserveTrack}
                defaultSingerName={guestName}
                isHost={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Media Remote Control Bar */}
      <RemoteControls
        isPlaying={room?.is_playing ?? true}
        canSkip={canSkip}
        onPlayPause={(playing) => playPause(playing)}
        onSkip={() => skipTrack(guestName)}
        onReplay={replayTrack}
        onSendCheer={(type) => sendCheer(type, guestName)}
      />
    </div>
  );
};
