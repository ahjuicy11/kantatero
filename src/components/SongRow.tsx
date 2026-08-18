import type { Song } from "@/lib/mock-data";
import { SongCard } from "./SongCard";

type Props = {
  title: string;
  subtitle?: string;
  songs: Song[];
};

export function SongRow({ title, subtitle, songs }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between px-1">
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
          {subtitle && <p className="text-sm text-white/50">{subtitle}</p>}
        </div>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {songs.map((s, i) => (
          <div key={s.id} className="snap-start">
            <SongCard song={s} index={i} />
          </div>
        ))}
      </div>
    </section>
  );
}
