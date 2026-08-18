import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { QrCode, Copy, Check, Users, Trash2, Power, Sliders, Smartphone } from 'lucide-react';
import { RoomSettings, ConnectedGuest } from '../types';

interface SettingsModalProps {
  roomCode: string;
  settings: RoomSettings;
  guests: ConnectedGuest[];
  onUpdateSettings: (settings: Partial<RoomSettings>) => void;
  onClearQueue: () => void;
  onEndRoom: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  roomCode,
  settings,
  guests,
  onUpdateSettings,
  onClearQueue,
  onEndRoom,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [showEndConfirm, setShowEndConfirm] = useState<boolean>(false);

  const remoteUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/remote/${roomCode}`
    : `/remote/${roomCode}`;

  useEffect(() => {
    QRCode.toDataURL(
      remoteUrl,
      {
        width: 220,
        margin: 2,
        color: {
          dark: '#050505',
          light: '#818cf8',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [remoteUrl]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(remoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-5 pr-1 select-none text-slate-200">
      {/* 1. Pair a Phone QR Code Section */}
      <div className="p-4 rounded-3xl bg-indigo-500/5 border border-white/5 shadow-xl flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-3">
          <Smartphone className="w-4 h-4" />
          <span>Scan to Connect Remote</span>
        </div>

        {/* QR Image Container */}
        <div className="p-2 rounded-2xl bg-white shadow-xl shadow-indigo-500/10 mb-3">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Room QR Code"
              className="w-32 h-32 md:w-36 md:h-36 rounded-xl object-contain"
            />
          ) : (
            <div className="w-32 h-32 flex items-center justify-center bg-zinc-900 rounded-xl">
              <QrCode className="w-10 h-10 text-indigo-400 animate-pulse" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-slate-400">Room Code:</span>
          <span className="px-3 py-1 rounded-xl bg-indigo-500/20 text-indigo-300 font-mono font-bold text-sm tracking-widest border border-indigo-500/30">
            {roomCode}
          </span>
        </div>

        {/* Copy Invite Link */}
        <button
          id="copy-remote-link-btn"
          onClick={handleCopyLink}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/10 transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Remote Link</span>
            </>
          )}
        </button>
      </div>

      {/* 2. Playback & Guest Rules */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Playback & Rules</span>
        </h4>

        {/* Autoplay toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div>
            <span className="text-xs font-semibold text-white block">Autoplay Next Song</span>
            <span className="text-[10px] text-slate-400">Advance to next song when finished</span>
          </div>
          <button
            id="toggle-autoplay-btn"
            onClick={() => onUpdateSettings({ autoplay: !settings.autoplay })}
            className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
              settings.autoplay ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.autoplay ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Allow Guest Skip */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div>
            <span className="text-xs font-semibold text-white block">Allow Guests to Skip</span>
            <span className="text-[10px] text-slate-400">Permit mobile remotes to skip songs</span>
          </div>
          <button
            id="toggle-allow-guest-skip-btn"
            onClick={() => onUpdateSettings({ allow_guest_skip: !settings.allow_guest_skip })}
            className={`w-11 h-6 rounded-full transition-colors cursor-pointer relative p-0.5 ${
              settings.allow_guest_skip ? 'bg-indigo-600' : 'bg-white/10'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                settings.allow_guest_skip ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Max songs per guest */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div>
            <span className="text-xs font-semibold text-white block">Max Songs Per Singer</span>
            <span className="text-[10px] text-slate-400">Prevent queue flooding</span>
          </div>
          <input
            id="max-songs-input"
            type="number"
            min={1}
            max={50}
            value={settings.max_songs_per_guest}
            onChange={(e) => {
              const val = Math.max(1, Math.min(50, parseInt(e.target.value) || 10));
              onUpdateSettings({ max_songs_per_guest: val });
            }}
            className="w-14 px-2 py-1 rounded-xl bg-black/40 text-indigo-300 font-mono font-bold text-center text-xs border border-white/10 focus:outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      {/* 3. Connected Singers */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 px-1">
          <Users className="w-3.5 h-3.5 text-indigo-400" />
          <span>Connected Singers ({guests.length})</span>
        </h4>

        {guests.length === 0 ? (
          <p className="text-xs text-slate-500 italic px-1">No singers connected yet. Share the QR code!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {guests.map((g) => (
              <div
                key={g.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs"
              >
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-semibold text-slate-200">{g.name}</span>
                {g.role === 'host' && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Danger Controls */}
      <div className="pt-2 border-t border-white/5 space-y-2.5">
        <h4 className="text-xs font-bold text-red-400 uppercase tracking-widest px-1">Danger Zone</h4>

        <div className="flex flex-col gap-2">
          {showClearConfirm ? (
            <div className="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-red-950/30 border border-red-500/20">
              <span className="text-xs text-red-300 flex-1">Clear all queued songs?</span>
              <button
                onClick={() => {
                  onClearQueue();
                  setShowClearConfirm(false);
                }}
                className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-2 py-1 rounded-xl bg-white/10 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="clear-queue-btn"
              onClick={() => setShowClearConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Upcoming Queue</span>
            </button>
          )}

          {showEndConfirm ? (
            <div className="w-full flex items-center gap-2 p-2.5 rounded-2xl bg-red-950/30 border border-red-500/20">
              <span className="text-xs text-red-300 flex-1">End session for all?</span>
              <button
                onClick={() => {
                  onEndRoom();
                  setShowEndConfirm(false);
                }}
                className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs cursor-pointer"
              >
                End
              </button>
              <button
                onClick={() => setShowEndConfirm(false)}
                className="px-2 py-1 rounded-xl bg-white/10 text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              id="end-room-btn"
              onClick={() => setShowEndConfirm(true)}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-red-900/20 hover:bg-red-600 text-white border border-red-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <Power className="w-3.5 h-3.5" />
              <span>End Karaoke Session</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
