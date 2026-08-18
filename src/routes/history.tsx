import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { SongCard } from "@/components/SongCard";
import { useKaraoke } from "@/stores/karaoke-store";
import { Clock } from "lucide-react";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "History — Karaoke" },
      { name: "description", content: "Recently played karaoke tracks — quickly reserve them again." },
    ],
  }),
});

function HistoryInner() {
  const history = useKaraoke((s) => s.history);
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold">
          <Clock className="h-6 w-6" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Recently Played</h1>
          <p className="text-sm text-white/50">{history.length} track{history.length === 1 ? "" : "s"}</p>
        </div>
      </header>
      {history.length === 0 ? (
        <div className="glass grid place-items-center rounded-3xl p-16 text-center">
          <p className="text-white/60">Play a song to start building your history.</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {history.map((s, i) => <SongCard key={`${s.id}-${s.playedAt}`} song={s} index={i} variant="row" />)}
        </div>
      )}
    </div>
  );
}

function HistoryPage() {
  return <ClientOnly fallback={<div className="p-8 text-white/50">Loading…</div>}><HistoryInner /></ClientOnly>;
}
