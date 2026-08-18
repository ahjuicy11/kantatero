import { createFileRoute, Link } from "@tanstack/react-router";
import { CATEGORIES, songsByCategory } from "@/lib/mock-data";
import { motion } from "framer-motion";

export const Route = createFileRoute("/categories")({
  component: CategoriesPage,
  head: () => ({
    meta: [
      { title: "Categories — Karaoke" },
      { name: "description", content: "Browse karaoke by genre and language — OPM, K-Pop, Rock, Classic, and more." },
    ],
  }),
});

function CategoriesPage() {
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Categories</h1>
        <p className="text-sm text-white/50">Pick a genre and start singing.</p>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {CATEGORIES.map((c, i) => {
          const count = songsByCategory(c.slug).length;
          return (
            <motion.div
              key={c.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to="/category/$slug"
                params={{ slug: c.slug }}
                className="group relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-2xl p-4 ring-1 ring-white/5 transition hover:ring-white/25"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${c.color}`} />
                <div className="absolute inset-0 bg-black/40 transition group-hover:bg-black/25" />
                <span className="relative text-4xl">{c.emoji}</span>
                <div className="relative">
                  <div className="font-display text-xl font-bold">{c.label}</div>
                  <div className="text-xs text-white/70">{count} songs</div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
