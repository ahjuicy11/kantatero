import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CATEGORIES, songsByCategory, type Category, type Song } from "@/lib/mock-data";
import { SongCard } from "@/components/SongCard";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/category/$slug")({
  loader: ({ params }) => {
    const cat = CATEGORIES.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat, songs: songsByCategory(params.slug as Category) };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.cat.label} Karaoke — Karaoke` },
          { name: "description", content: `Browse ${loaderData.cat.label} karaoke tracks and reserve them to the queue.` },
        ]
      : [{ title: "Category — Karaoke" }, { name: "robots", content: "noindex" }],
  }),
  component: CategoryPage,
});

function CategoryPage() {
  const { cat, songs } = Route.useLoaderData();
  return (
    <div className="space-y-6 pb-16">
      <div className={`relative overflow-hidden bg-gradient-to-br ${cat.color} px-4 py-12 sm:px-6`}>
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative mx-auto max-w-[1400px]">
          <Link to="/categories" className="mb-4 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
            <ChevronLeft className="h-4 w-4" /> All categories
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-6xl">{cat.emoji}</span>
            <div>
              <h1 className="font-display text-4xl font-black sm:text-5xl">{cat.label}</h1>
              <p className="text-sm text-white/70">{songs.length} songs</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="grid gap-2 sm:hidden">
          {songs.map((s: Song, i: number) => <SongCard key={s.id} song={s} index={i} variant="row" />)}
        </div>
        <div className="hidden gap-4 sm:grid sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
          {songs.map((s: Song, i: number) => <SongCard key={s.id} song={s} index={i} />)}
        </div>
      </div>
    </div>
  );
}
