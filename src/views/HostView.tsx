import React, { useState } from 'react';
import { ListMusic, PlusCircle, Settings, Users, QrCode, Sparkles, Tv, AlertCircle } from 'lucide-react';
import { useRoomRealtime } from '../hooks/useRoomRealtime';
import { YouTubePlayer } from '../components/YouTubePlayer';
import { QueueList } from '../components/QueueList';
import { AddSongPanel } from '../components/AddSongPanel';
import { SettingsModal } from '../components/SettingsModal';
import { CheerOverlay } from '../components/CheerOverlay';
import { Navbar } from '../components/Navbar';
import { QueueItem } from '../types';

interface HostViewProps {
  roomCode: string;
  onGoHome: () => void;
}

type TabType = 'queue' | 'add_song' | 'settings';

export const HostView: React.FC<HostViewProps> = ({ roomCode, onGoHome }) => {
  const [activeTab, setActiveTab] = useState<TabType>('queue');

  const {
    room,
    queue,
    guests,
    currentTrack,
    isConnected,
    recentCheers,
    lastPlayerCommand,
    errorMessage,
    addToQueue,
    updateStatus,
    skipTrack,
    replayTrack,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    updateSettings,
    endRoom,
  } = useRoomRealtime({
    roomCode,
    role: 'host',
    guestName: 'Host Display',
    onRoomEnded: onGoHome,
  });

  const handleTrackEnded = () => {
    if (room?.settings.autoplay) {
      skipTrack();
    }
  };

  const handlePlayNow = (queueItemId: string) => {
    updateStatus(queueItemId, 'playing');
  };

  const handleMoveUp = (id: string) => {
    const queued = queue.filter((q) => q.status === 'queued');
    const idx = queued.findIndex((q) => q.id === id);
    if (idx > 0) {
      const newQueued = [...queued];
      const temp = newQueued[idx - 1];
      newQueued[idx - 1] = newQueued[idx];
      newQueued[idx] = temp;
      reorderQueue(newQueued.map((q) => q.id));
    }
  };

  const handleMoveDown = (id: string) => {
    const queued = queue.filter((q) => q.status === 'queued');
    const idx = queued.findIndex((q) => q.id === id);
    if (idx !== -1 && idx < queued.length - 1) {
      const newQueued = [...queued];
      const temp = newQueued[idx + 1];
      newQueued[idx + 1] = newQueued[idx];
      newQueued[idx] = temp;
      reorderQueue(newQueued.map((q) => q.id));
    }
  };

  const handleReserveFromAddSong = (track: Omit<QueueItem, 'id' | 'room_code' | 'created_at' | 'status'>) => {
    addToQueue(track);
  };

  const queuedCount = queue.filter((q) => q.status === 'queued').length;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-slate-50 font-sans overflow-hidden relative selection:bg-indigo-500 selection:text-white">
      {/* Ambient Immersive Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Animated Cheers */}
      <CheerOverlay cheers={recentCheers} />

      {/* Navbar Header */}
      <Navbar
        roomCode={roomCode}
        roomName={room?.name}
        isConnected={isConnected}
        onGoHome={onGoHome}
        guestCount={guests.length}
      />

      {/* Error notification banner */}
      {errorMessage && (
        <div className="bg-red-500/20 border-b border-red-500/30 px-4 py-2 text-center text-xs text-red-300 flex items-center justify-center gap-2 relative z-20">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Responsive Grid Layout */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-4 sm:p-6 gap-4 sm:gap-6 relative z-10 max-w-7xl mx-auto w-full">
        {/* Left Section: Video Player Display Area (flex-[2.2]) */}
        <section className="flex-1 lg:flex-[2.2] flex flex-col min-h-[320px] sm:min-h-[440px] lg:min-h-[540px] shrink-0 lg:shrink">
          <YouTubePlayer
            currentTrack={currentTrack}
            autoplay={room?.settings.autoplay ?? true}
            onTrackEnded={handleTrackEnded}
            onSkipNext={() => skipTrack('Host')}
            onReplay={replayTrack}
            remoteCommand={lastPlayerCommand}
            onAddSongClick={() => setActiveTab('add_song')}
          />
        </section>

        {/* Right Section: Sidebar (flex-1) */}
        <aside className="w-full lg:w-[32%] flex-1 lg:flex-initial flex flex-col gap-4 h-[520px] lg:h-auto">
          {/* Tab Switcher */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 select-none">
            <button
              id="host-tab-queue"
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                  : 'text-slate-400 font-medium hover:text-white'
              }`}
            >
              Queue ({queuedCount})
            </button>

            <button
              id="host-tab-add-song"
              onClick={() => setActiveTab('add_song')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'add_song'
                  ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                  : 'text-slate-400 font-medium hover:text-white'
              }`}
            >
              Search
            </button>

            <button
              id="host-tab-settings"
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-3 rounded-xl text-xs sm:text-sm transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                  : 'text-slate-400 font-medium hover:text-white'
              }`}
            >
              Settings
            </button>
          </div>

          {/* Sidebar Content Panel */}
          <div className="flex-1 bg-white/[0.03] rounded-3xl border border-white/5 flex flex-col overflow-hidden p-3.5 sm:p-4">
            {activeTab === 'queue' && (
              <QueueList
                queue={queue}
                currentTrackId={room?.current_track_id}
                onPlayNow={handlePlayNow}
                onRemove={(id) => removeFromQueue(id, 'Host')}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isHost={true}
                currentUser="Host"
              />
            )}

            {activeTab === 'add_song' && (
              <AddSongPanel
                onReserve={handleReserveFromAddSong}
                defaultSingerName="Host"
                isHost={true}
              />
            )}

            {activeTab === 'settings' && room && (
              <SettingsModal
                roomCode={roomCode}
                settings={room.settings}
                guests={guests}
                onUpdateSettings={updateSettings}
                onClearQueue={clearQueue}
                onEndRoom={endRoom}
              />
            )}
          </div>
        </aside>
      </main>

      {/* Immersive Footer Status Bar */}
      <footer className="h-12 px-4 sm:px-8 flex items-center justify-between bg-black/40 border-t border-white/5 text-[10px] uppercase tracking-widest font-bold text-slate-500 select-none relative z-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <span>Server: ASIA-EAST</span>
          <span className="hidden sm:inline">Latency: 24ms</span>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
            Autoplay {room?.settings.autoplay ? 'ON' : 'OFF'}
          </span>
          <span className="hidden sm:inline">Max songs: {room?.settings.max_songs_per_guest || 10}</span>
        </div>
      </footer>
    </div>
  );
};
