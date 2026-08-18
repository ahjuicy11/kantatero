import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Loader2, Mic2, Radio, Sparkles, Tv } from "lucide-react";
import { toast } from "sonner";
import { createRoom, getRoomByCode } from "@/lib/room-client";


export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Karaoke — Create or Join a Room" },
      {
        name: "description",
        content:
          "Start a karaoke room on your TV or join one from your phone. Reserve songs to a shared queue and pass the mic.",
      },
    ],
  }),
});

const HOST_KEY = "karaoke.hosted-room";
const NAME_KEY = "karaoke.remote-name";

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,oklch(0.63_0.25_25/0.35),transparent_40%),radial-gradient(circle_at_80%_20%,oklch(0.85_0.17_90/0.2),transparent_50%),radial-gradient(circle_at_50%_100%,oklch(0.5_0.2_300/0.2),transparent_50%)]" />
        <div className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center gap-1 opacity-30 sm:h-56">
          {Array.from({ length: 48 }).map((_, i) => (
            <span
              key={i}
              className="eq-bar w-2 rounded-t-sm bg-gradient-to-t from-primary to-gold"
              style={{
                height: `${25 + ((i * 37) % 70)}%`,
                animationDelay: `${i * 60}ms`,
                animationDuration: `${900 + (i % 5) * 200}ms`,
              }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 pb-8 pt-14 text-center sm:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          One TV plays. Everyone reserves from their phone.
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="font-display text-4xl font-black leading-[1.05] sm:text-6xl md:text-7xl"
        >
          Start your <span className="text-gradient-fire">karaoke</span> night
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mx-auto mt-4 max-w-xl text-sm text-white/60 sm:text-base"
        >
          Create a room to turn this screen into the karaoke display, or join an
          existing room from your phone.
        </motion.p>
      </div>
    </section>
  );
}

function Home() {
  const nav = useNavigate();
  const [savedName, setSavedName] = useState("");

  useEffect(() => {
    try {
      setSavedName(localStorage.getItem(NAME_KEY) || "");
    } catch {}
  }, []);

  const [roomName, setRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const [joinName, setJoinName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (savedName) setJoinName((v) => v || savedName);
  }, [savedName]);

  const startKaraoke = async () => {
    setCreating(true);
    try {
      const r = await createRoom(roomName.trim() || undefined);
      localStorage.setItem(HOST_KEY, JSON.stringify(r));
      window.dispatchEvent(new Event("karaoke:host-changed"));
      toast.success(`Room ${r.code} is live`);
      nav({ to: "/player" });
    } catch (e) {
      console.error(e);
      toast.error("Could not create room");
    } finally {
      setCreating(false);
    }
  };

  const joinKaraoke = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a room code");
      return;
    }
    setJoining(true);
    try {
      const r = await getRoomByCode(code);
      if (!r) {
        toast.error("Room not found");
        return;
      }
      const name = joinName.trim() || "Guest";
      localStorage.setItem(NAME_KEY, name);
      nav({ to: "/r/$code", params: { code: r.code } });
    } catch {
      toast.error("Could not join");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="pb-24">
      
      <Hero />
      <section className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-2">
        {/* Create room */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass relative overflow-hidden rounded-3xl border border-white/10 p-6"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/15 text-primary">
              <Tv className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Create karaoke room</h2>
              <p className="text-xs text-white/50">Host on this screen (TV / laptop).</p>
            </div>
          </div>

          <label className="mt-6 block text-[10px] uppercase tracking-widest text-white/40">
            Room name (optional)
          </label>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value.slice(0, 40))}
            placeholder="Friday Night Sing-off"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-primary/40"
          />

          <button
            onClick={startKaraoke}
            disabled={creating}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow-red disabled:opacity-60"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic2 className="h-4 w-4" />}
            Start karaoke
          </button>
        </motion.div>

        {/* Join room */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass relative overflow-hidden rounded-3xl border border-white/10 p-6"
        >
          <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-gold/20 blur-3xl" />
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Radio className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Join karaoke room</h2>
              <p className="text-xs text-white/50">Control the queue from your phone.</p>
            </div>
          </div>

          <label className="mt-6 block text-[10px] uppercase tracking-widest text-white/40">
            Your name
          </label>
          <input
            value={joinName}
            onChange={(e) => setJoinName(e.target.value.slice(0, 24))}
            placeholder="e.g. Jamie"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm outline-none focus:border-primary/40"
          />

          <label className="mt-4 block text-[10px] uppercase tracking-widest text-white/40">
            Room code
          </label>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            onKeyDown={(e) => {
              if (e.key === "Enter") joinKaraoke();
            }}
            placeholder="ABC123"
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-center font-display text-2xl font-black tracking-[0.4em] text-gradient-fire outline-none focus:border-primary/50"
          />

          <button
            onClick={joinKaraoke}
            disabled={joining || !joinCode}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white/10 py-3 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-50"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Join karaoke room
          </button>
        </motion.div>
      </section>
    </div>
  );
}
