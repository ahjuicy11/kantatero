import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Radio } from "lucide-react";
import { toast } from "sonner";
import { getRoomByCode } from "@/lib/room-client";

export const Route = createFileRoute("/r/join")({
  component: JoinPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Join Karaoke Room" },
      { name: "description", content: "Enter the code shown on the TV screen to join a karaoke room." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function JoinPage() {
  return (
    <ClientOnly fallback={null}>
      <JoinInner />
    </ClientOnly>
  );
}

function JoinInner() {
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const join = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const r = await getRoomByCode(code.trim());
      if (!r) { toast.error("Room not found"); return; }
      nav({ to: "/r/$code", params: { code: r.code } });
    } catch {
      toast.error("Could not join");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-md place-items-center px-4">
      <div className="glass w-full rounded-3xl border border-white/5 p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Radio className="h-6 w-6" />
        </div>
        <h1 className="mt-3 text-xl font-bold">Join a karaoke room</h1>
        <p className="mt-1 text-sm text-white/50">Enter the code shown on the TV screen.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          placeholder="ABC123"
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-center font-display text-3xl font-black tracking-[0.4em] text-gradient-fire outline-none focus:border-primary/50"
        />
        <button
          onClick={join}
          disabled={busy || !code}
          className="mt-4 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-glow-red disabled:opacity-50"
        >
          {busy ? "Joining…" : "Join room"}
        </button>
      </div>
    </div>
  );
}
