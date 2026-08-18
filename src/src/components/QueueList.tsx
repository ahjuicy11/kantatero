import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Trash2, ArrowUp, ArrowDown, Music2, User, Clock } from 'lucide-react';
import { QueueItem } from '../types';

interface QueueListProps {
  queue: QueueItem[];
  currentTrackId?: string | null;
  onPlayNow?: (id: string) => void;
  onRemove?: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  isHost?: boolean;
  currentUser?: string;
}

export const QueueList: React.FC<QueueListProps> = ({
  queue,
  currentTrackId,
  onPlayNow,
  onRemove,
  onMoveUp,
  onMoveDown,
  isHost = true,
  currentUser = '',
}) => {
  const queuedSongs = queue.filter((q) => q.status === 'queued');
  const playingSong = queue.find((q) => q.status === 'playing');
  const playedSongs = queue.filter((q) => q.status === 'played');

  // Estimate wait time: approx 3.5 min per queued song
  const estWaitMins = queuedSongs.length * 4;

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-1 select-none">
      {/* Current Playing Banner */}
      {playingSong && (
        <div className="mb-3 p-3 rounded-2xl bg-white/[0.04] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-indigo-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              Now Singing
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-300 rounded-full border border-indigo-500/20 font-bold uppercase">
              {playingSong.added_by}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <img
              src={playingSong.thumbnail_url}
              alt={playingSong.title}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-white truncate leading-tight">
                {playingSong.title}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {playingSong.channel_title}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Up Next Header & Wait Estimate */}
      <div className="p-3 border-b border-white/5 flex justify-between items-center mb-2">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Up Next ({queuedSongs.length})
        </span>
        {queuedSongs.length > 0 && (
          <span className="text-[10px] text-indigo-400 font-mono font-semibold tracking-wider">
            EST. WAIT: {estWaitMins} MIN
          </span>
        )}
      </div>

      {/* Queued Songs List */}
      {queuedSongs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center border border-white/5 rounded-2xl bg-white/[0.02]">
          <Music2 className="w-8 h-8 text-slate-600 mb-2" />
          <p className="text-xs text-slate-400 font-medium">The queue is currently empty</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Search or scan QR to add the next song!</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {queuedSongs.map((item, index) => {
              const canDelete = isHost || item.added_by.toLowerCase() === currentUser.toLowerCase();

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group p-3 rounded-2xl bg-white/[0.02] hover:bg-white/5 transition-all flex gap-3 items-center border border-white/5 hover:border-white/10"
                >
                  {/* Position number */}
                  <span className="w-5 text-center text-[11px] font-mono font-bold text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0">
                    {index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden shrink-0 border border-white/5">
                    <img
                      src={item.thumbnail_url}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Title & Channel */}
                  <div className="flex-1 overflow-hidden min-w-0">
                    <h4 className="text-xs font-bold text-slate-200 truncate group-hover:text-white transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.channel_title}
                    </p>
                  </div>

                  {/* Singer Tag */}
                  <div className="text-right shrink-0">
                    <span className="text-[10px] px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20 font-bold uppercase tracking-tight">
                      {item.added_by}
                    </span>
                  </div>

                  {/* Action Controls */}
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition-opacity shrink-0">
                    {isHost && onMoveUp && index > 0 && (
                      <button
                        onClick={() => onMoveUp(item.id)}
                        title="Move Up"
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isHost && onMoveDown && index < queuedSongs.length - 1 && (
                      <button
                        onClick={() => onMoveDown(item.id)}
                        title="Move Down"
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isHost && onPlayNow && (
                      <button
                        onClick={() => onPlayNow(item.id)}
                        title="Play Now"
                        className="p-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    {canDelete && onRemove && (
                      <button
                        onClick={() => onRemove(item.id)}
                        title="Remove from queue"
                        className="p-1 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Recently Sang summary */}
      {playedSongs.length > 0 && (
        <div className="pt-4 mt-auto">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 block mb-2 px-1">
            Recently Sang ({playedSongs.length})
          </span>
          <div className="space-y-1.5 opacity-60">
            {playedSongs.slice(-3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-xl bg-white/[0.01] border border-white/5 text-xs text-slate-400"
              >
                <span className="line-through truncate flex-1">{item.title}</span>
                <span className="text-[10px] text-slate-500 ml-2">by {item.added_by}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
