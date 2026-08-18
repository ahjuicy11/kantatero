import React, { useState } from 'react';
import { Mic2, Tv, Smartphone, Sparkles, ArrowRight, Music, Users, ShieldCheck, Flame, Radio } from 'lucide-react';
import { CURATED_CATEGORIES, POPULAR_KARAOKE_SONGS } from '../lib/curatedKaraoke';
import { EqualizerHeroCanvas } from '../components/EqualizerHeroCanvas';

interface LandingViewProps {
  onCreateRoom: (roomName: string) => void;
  onJoinRoom: (code: string, guestName: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onCreateRoom,
  onJoinRoom,
}) => {
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [guestName, setGuestName] = useState('');
  const [activePreviewCategory, setActivePreviewCategory] = useState('All Hits');
  const [joinError, setJoinError] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(newRoomName.trim() || 'Karaoke Party');
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length < 4) {
      setJoinError('Please enter a valid 6-character room code');
      return;
    }
    setJoinError('');
    onJoinRoom(cleanCode, guestName.trim() || 'Guest Singer');
  };

  const filteredPreviewSongs =
    activePreviewCategory === 'All Hits'
      ? POPULAR_KARAOKE_SONGS.slice(0, 8)
      : POPULAR_KARAOKE_SONGS.filter((s) => s.category === activePreviewCategory).slice(0, 8);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-50 font-sans flex flex-col relative overflow-x-hidden selection:bg-indigo-500 selection:text-white">
      {/* Ambient Immersive Lighting Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="h-16 w-full flex items-center justify-between px-6 sm:px-12 border-b border-white/5 bg-black/20 backdrop-blur-md z-20 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Mic2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              KANTATERO
            </span>
            <span className="text-[9px] uppercase tracking-widest text-slate-500 font-semibold -mt-1">
              Immersive Karaoke
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 text-xs text-slate-300">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span>Realtime Rooms Live</span>
          </div>
        </div>
      </header>

      {/* Hero Interactive Equalizer Stage Canvas */}
      <div className="relative w-full overflow-hidden pt-12 pb-8 sm:pt-16 sm:pb-12 border-b border-white/5">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <EqualizerHeroCanvas />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center flex flex-col items-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dark Premium Entertainment</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight mb-4 drop-shadow-2xl">
            Sing Together.{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Host On TV, Control by Phone.
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-2xl leading-relaxed mb-8">
            Create an interactive karaoke party room on your screen. Guests scan the QR code to reserve songs, adjust queue, and drop cheers in real time.
          </p>
        </div>
      </div>

      {/* Main Dual Setup Sections: Host on Big Screen vs. Join Remote */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 relative z-10 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* 1. Host A New Screen / Room Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-indigo-500/30 transition-all shadow-2xl flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25">
                  <Tv className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  TV / Stage Display
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                Start Karaoke Host
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                Open a host room on your TV, laptop, or projector. Plays full karaoke videos and displays QR code for guests.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                    Room Name
                  </label>
                  <input
                    id="host-room-name-input"
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Friday Night Karaoke"
                    maxLength={32}
                    className="w-full px-4 py-3 bg-white/5 rounded-2xl text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-indigo-400 transition-colors shadow-inner"
                  />
                </div>

                <button
                  id="create-room-submit-btn"
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-black text-sm tracking-wide shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                >
                  <Mic2 className="w-4 h-4" />
                  <span>Launch Host Display</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-white/5 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                YouTube Music Sync
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-purple-400" />
                Unlimited Guests
              </span>
            </div>
          </div>

          {/* 2. Join via 6-Digit Room Code Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 hover:border-purple-500/30 transition-all shadow-2xl flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-xl shadow-purple-500/25">
                  <Smartphone className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Guest Remote
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                Join with Room Code
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm leading-relaxed mb-6">
                Connect your smartphone or tablet to an existing party room. Search tracks and send cheer soundboard effects.
              </p>

              <form onSubmit={handleJoinSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                      6-Digit Code
                    </label>
                    <input
                      id="join-room-code-input"
                      type="text"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      placeholder="e.g. KARA88"
                      maxLength={8}
                      className="w-full px-4 py-3 bg-white/5 rounded-2xl text-sm font-mono font-bold text-indigo-400 placeholder-slate-500 border border-white/10 focus:outline-none focus:border-purple-400 transition-colors uppercase tracking-wider text-center shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">
                      Singer Name
                    </label>
                    <input
                      id="join-singer-name-input"
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="e.g. Alex"
                      maxLength={20}
                      className="w-full px-4 py-3 bg-white/5 rounded-2xl text-sm text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-purple-400 transition-colors shadow-inner"
                    />
                  </div>
                </div>

                {joinError && (
                  <p className="text-xs text-red-400 font-medium">{joinError}</p>
                )}

                <button
                  id="join-room-submit-btn"
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-sm tracking-wide border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer shadow-lg"
                >
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>Enter Remote Controller</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-white/5 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                Live Soundboard
              </span>
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-emerald-400" />
                Instant Queueing
              </span>
            </div>
          </div>
        </div>

        {/* 3. Popular Karaoke Hits Preview */}
        <div className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-indigo-400" />
                <span>Popular Karaoke Library</span>
              </h3>
              <p className="text-xs text-slate-400">
                Thousands of karaoke & backing tracks ready to stream
              </p>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {CURATED_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivePreviewCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activePreviewCategory === cat
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {filteredPreviewSongs.map((track) => (
              <div
                key={track.video_id}
                className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-center gap-3"
              >
                <img
                  src={track.thumbnail_url}
                  alt={track.title}
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{track.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{track.channel_title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-12 px-6 sm:px-12 flex items-center justify-between bg-black/40 border-t border-white/5 text-[10px] uppercase tracking-widest font-bold text-slate-500 relative z-10">
        <span>Kantatero © 2026</span>
        <span>Dark Premium Entertainment</span>
      </footer>
    </div>
  );
};
