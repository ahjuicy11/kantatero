import React, { useState, useEffect } from 'react';
import { Search, Music, Plus, Check, Loader2, Sparkles } from 'lucide-react';
import { SearchTrack, QueueItem } from '../types';
import { CURATED_CATEGORIES, POPULAR_KARAOKE_SONGS } from '../lib/curatedKaraoke';
import confetti from 'canvas-confetti';

interface AddSongPanelProps {
  onReserve: (track: Omit<QueueItem, 'id' | 'room_code' | 'created_at' | 'status'>) => void;
  defaultSingerName?: string;
  isHost?: boolean;
}

export const AddSongPanel: React.FC<AddSongPanelProps> = ({
  onReserve,
  defaultSingerName = 'Guest',
  isHost = false,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Hits');
  const [singerName, setSingerName] = useState(defaultSingerName);
  const [results, setResults] = useState<SearchTrack[]>(POPULAR_KARAOKE_SONGS.slice(0, 12));
  const [loading, setLoading] = useState(false);
  const [reservedIds, setReservedIds] = useState<Set<string>>(new Set());

  // Search API fetch with debounce
  useEffect(() => {
    if (!query.trim()) {
      if (selectedCategory === 'All Hits') {
        setResults(POPULAR_KARAOKE_SONGS.slice(0, 16));
      } else {
        const filtered = POPULAR_KARAOKE_SONGS.filter((t) => t.category === selectedCategory);
        setResults(filtered.length > 0 ? filtered : POPULAR_KARAOKE_SONGS.slice(0, 10));
      }
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
        }
      } catch (e) {
        console.error('Search request failed:', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selectedCategory]);

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    setQuery('');
  };

  const handleReserve = (track: SearchTrack) => {
    const finalSinger = singerName.trim() || (isHost ? 'Host' : 'Guest Singer');

    onReserve({
      video_id: track.video_id,
      title: track.title,
      channel_title: track.channel_title,
      thumbnail_url: track.thumbnail_url,
      duration: track.duration || '3:45',
      added_by: finalSinger,
    });

    setReservedIds((prev) => new Set(prev).add(track.video_id));
    setTimeout(() => {
      setReservedIds((prev) => {
        const next = new Set(prev);
        next.delete(track.video_id);
        return next;
      });
    }, 2500);

    try {
      confetti({
        particleCount: 25,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#6366f1', '#a855f7', '#ec4899'],
      });
    } catch (e) {}
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-3.5 pr-1 select-none">
      {/* Singer Name Config */}
      <div className="flex items-center gap-2 bg-white/[0.02] p-2 rounded-2xl border border-white/5">
        <span className="text-[11px] text-slate-400 font-medium shrink-0 ml-1">Singing as:</span>
        <input
          id="singer-name-input"
          type="text"
          value={singerName}
          onChange={(e) => setSingerName(e.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="flex-1 bg-black/40 px-3 py-1 rounded-xl text-xs font-semibold text-indigo-300 border border-white/10 focus:outline-none focus:border-indigo-400"
        />
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          id="in-room-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search song or artist (auto-karaoke)..."
          className="w-full pl-10 pr-10 py-2.5 bg-white/5 rounded-2xl text-xs text-white placeholder-slate-500 border border-white/10 focus:outline-none focus:border-indigo-400 transition-colors shadow-inner"
        />
        {loading && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
        )}
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
        {CURATED_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat && !query;
          return (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Search Results List */}
      <div className="space-y-2 flex-1">
        {results.length === 0 && !loading ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No karaoke tracks found for "{query}". Try a different title!
          </div>
        ) : (
          results.map((track) => {
            const isReserved = reservedIds.has(track.video_id);

            return (
              <div
                key={track.video_id}
                className="group p-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all flex items-center gap-3"
              >
                {/* Thumbnail */}
                <div className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-zinc-800 border border-white/5">
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {track.duration && (
                    <span className="absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded bg-black/80 text-[8px] font-mono text-slate-200">
                      {track.duration}
                    </span>
                  )}
                </div>

                {/* Song Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                    {track.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{track.channel_title}</p>
                </div>

                {/* Reserve Action */}
                <button
                  id={`reserve-btn-${track.video_id}`}
                  onClick={() => handleReserve(track)}
                  disabled={isReserved}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                    isReserved
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white border border-indigo-500/30 active:scale-95'
                  }`}
                >
                  {isReserved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Added</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Reserve</span>
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
