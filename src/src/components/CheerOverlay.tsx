import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheerEvent } from '../types';

interface CheerOverlayProps {
  cheers: CheerEvent[];
}

const CHEER_ICONS: Record<string, { emoji: string; label: string; bg: string; text: string }> = {
  applause: { emoji: '👏', label: 'Applause!', bg: 'from-amber-500/20 to-orange-500/20', text: 'text-amber-300' },
  airhorn: { emoji: '📢', label: 'AIRHORN!', bg: 'from-red-500/30 to-pink-500/30', text: 'text-red-400 font-black tracking-widest' },
  cheer: { emoji: '🎉', label: 'Wooohoo!', bg: 'from-purple-500/20 to-indigo-500/20', text: 'text-purple-300' },
  fire: { emoji: '🔥', label: 'ON FIRE!', bg: 'from-orange-500/30 to-red-500/30', text: 'text-orange-400 font-bold' },
  heart: { emoji: '💖', label: 'Love this song!', bg: 'from-pink-500/20 to-rose-500/20', text: 'text-pink-300' },
  mic_drop: { emoji: '🎤💥', label: 'MIC DROP!', bg: 'from-cyan-500/30 to-blue-500/30', text: 'text-cyan-300 font-black' },
  wow: { emoji: '🤩', label: 'AMAZING!', bg: 'from-emerald-500/20 to-teal-500/20', text: 'text-emerald-300' },
};

export const CheerOverlay: React.FC<CheerOverlayProps> = ({ cheers }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <AnimatePresence>
        {cheers.map((cheer) => {
          const config = CHEER_ICONS[cheer.type] || CHEER_ICONS.cheer;
          const leftPercent = cheer.x ?? 50;
          const bottomPercent = cheer.y ?? 20;

          return (
            <motion.div
              key={cheer.id}
              initial={{
                opacity: 0,
                scale: 0.4,
                y: 30,
                x: 0,
              }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.6, 1.25, 1.1, 0.9],
                y: [-20, -120, -180],
                x: [(Math.random() - 0.5) * 30, (Math.random() - 0.5) * 60],
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 3.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                left: `${leftPercent}%`,
                bottom: `${bottomPercent}%`,
                transform: 'translateX(-50%)',
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl backdrop-blur-xl border border-white/20 bg-slate-950/80 shadow-2xl shadow-cyan-500/20"
            >
              <span className="text-3xl filter drop-shadow-md animate-bounce">{config.emoji}</span>
              <div className="flex flex-col">
                <span className={`text-sm ${config.text}`}>{config.label}</span>
                <span className="text-[10px] text-slate-400 font-medium">{cheer.senderName}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
