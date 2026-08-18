import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { SongCard } from "@/components/SongCard";
import { useKaraoke } from "@/stores/karaoke-store";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/favorites")({
  component: FavoritesPage,
  ssr: false,
  head: () => ({
    meta: [
      { title: "Favorites — Karaoke" },
      { name: "description", content: "Your saved karaoke tracks — ready to reserve to the queue." },
    ],
  }),
});

function FavoritesInner() {
  const favs = useKaraoke((s) => s.favorites);
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/20 text-primary">
          <Heart className="h-6 w-6 fill-current" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Favorites</h1>
          <p className="text-sm text-white/50">{favs.length} saved song{favs.length === 1 ? "" : "s"}</p>
        </div>
      </header>
      {favs.length === 0 ? (
        <div className="glass grid place-items-center rounded-3xl p-16 text-center">
          <p className="text-white/60">Tap the ♥ on any song to save it here.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-2 sm:hidden">
            {favs.map((s, i) => <SongCard key={s.id} song={s} index={i} variant="row" />)}
          </div>
          <div className="hidden gap-4 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
            {favs.map((s, i) => <SongCard key={s.id} song={s} index={i} />)}
          </div>
        </>
      )}
    </div>
  );
}

function FavoritesPage() {
  return <ClientOnly fallback={<div className="p-8 text-white/50">Loading…</div>}><FavoritesInner /></ClientOnly>;
}
