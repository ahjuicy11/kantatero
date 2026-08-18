import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Copy, X, Radio, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { createRoom, type Room } from "@/lib/room-client";
import { useRoomHost } from "@/hooks/use-room-host";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "karaoke.hosted-room";


export function RoomHostPanel({ hideBar = false }: { hideBar?: boolean } = {}) {
  const navigate = useNavigate();
  const [room, setRoom] = useState<Room | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Restore previously hosted room
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setRoom(JSON.parse(raw));
    } catch {}
  }, []);

  useRoomHost(room?.id ?? null);

  // Allow other UI (e.g. sidebar Settings tab) to open the pair-a-phone modal
  // or trigger hosting when no room exists yet.
  useEffect(() => {
    const onShow = () => {
      if (room) setModalOpen(true);
      else startHosting();
    };
    const onEnd = () => {
      if (room) stopHosting();
    };
    window.addEventListener("karaoke:show-pair", onShow);
    window.addEventListener("karaoke:end-room", onEnd);
    return () => {
      window.removeEventListener("karaoke:show-pair", onShow);
      window.removeEventListener("karaoke:end-room", onEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const remoteUrl = useMemo(() => {
    if (!room) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/r/${room.code}`;
  }, [room]);

  const startHosting = async () => {
    setCreating(true);
    try {
      const r = await createRoom();
      setRoom(r);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
      window.dispatchEvent(new Event("karaoke:host-changed"));
      setModalOpen(true);
      toast.success(`Room ${r.code} is live`);
    } catch (e) {
      toast.error("Could not create room");
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const stopHosting = () => {
    setRoom(null);
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("karaoke:host-changed"));
    setModalOpen(false);
    toast.success("Room closed");
    navigate({ to: "/" });
  };

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard?.writeText(room.code);
    toast.success("Code copied");
  };
  const copyLink = () => {
    navigator.clipboard?.writeText(remoteUrl);
    toast.success("Link copied");
  };

  return (
    <>
      <div className={`glass flex-wrap items-center gap-3 rounded-2xl border border-white/5 p-3 ${hideBar ? "hidden" : "flex"}`}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Radio className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {room ? "Room hosting active" : "Host a room for phones"}
          </div>
          <div className="truncate text-xs text-white/50">
            {room
              ? `Code ${room.code} — anyone scanning the QR can add & control songs`
              : "Turn this screen into the karaoke display. Phones can join to reserve songs."}
          </div>
        </div>
        {room ? (
          <>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
            >
              <QrCode className="h-4 w-4" /> Show QR
            </button>
            <button
              onClick={stopHosting}
              className="rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/10"
            >
              End
            </button>
          </>
        ) : (
          <button
            onClick={startHosting}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow-red disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Host room
          </button>
        )}
      </div>

      <PairModal
        open={modalOpen && !!room}
        onClose={() => setModalOpen(false)}
        room={room}
        remoteUrl={remoteUrl}
        copyCode={copyCode}
        copyLink={copyLink}
      />
    </>
  );
}

function PairModal({
  open,
  onClose,
  room,
  remoteUrl,
  copyCode,
  copyLink,
}: {
  open: boolean;
  onClose: () => void;
  room: Room | null;
  remoteUrl: string;
  copyCode: () => void;
  copyLink: () => void;
}) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    // Poll briefly for the queue sidebar slot to exist.
    let raf = 0;
    const find = () => {
      const el = document.getElementById("pair-modal-slot");
      if (el) setSlot(el);
      else raf = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const content = (
    <AnimatePresence>
      {open && room && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-2 backdrop-blur sm:p-3"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong my-auto w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 p-3 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/60 sm:text-sm">
                <Users className="h-4 w-4" /> Pair a phone
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid place-items-center rounded-2xl bg-white p-2 sm:mt-4 sm:p-3">
              <QRCodeSVG value={remoteUrl} size={140} level="M" className="h-auto w-full max-w-[180px]" />
            </div>

            <div className="mt-3 text-center sm:mt-4">
              <div className="text-[10px] uppercase tracking-widest text-white/50 sm:text-xs">Join code</div>
              <button
                onClick={copyCode}
                className="mt-1 inline-flex items-center gap-2 font-display text-2xl font-black tracking-[0.3em] text-gradient-fire sm:text-3xl"
                title="Copy code"
              >
                {room.code}
              </button>
            </div>

            <div className="mt-3 space-y-2 text-sm sm:mt-4">
              <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs">
                <span className="truncate text-white/70">{remoteUrl}</span>
                <button
                  onClick={copyLink}
                  className="ml-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/15"
                  aria-label="Copy link"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-center text-[11px] text-white/50">
                Scan the QR, or open the link and enter code{" "}
                <span className="font-semibold text-white/80">{room.code}</span>.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );


  if (!slot) return null;
  return createPortal(content, slot);
}

