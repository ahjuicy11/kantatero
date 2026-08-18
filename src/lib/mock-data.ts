// Mock karaoke catalog. Real YouTube video IDs so the IFrame player works.
export type Song = {
  id: string;          // youtube video id
  title: string;
  artist: string;
  channel: string;
  duration: string;    // "3:45"
  views: string;
  publishedAt: string;
  thumbnail: string;
  category: Category;
};

export type Category =
  | "trending"
  | "opm"
  | "english"
  | "kpop"
  | "japanese"
  | "love"
  | "rock"
  | "classic"
  | "disney";

export const CATEGORIES: { slug: Category; label: string; emoji: string; color: string }[] = [
  { slug: "trending", label: "Trending", emoji: "🔥", color: "from-red-500/40 to-orange-500/20" },
  { slug: "opm", label: "OPM", emoji: "🇵🇭", color: "from-blue-500/40 to-red-500/20" },
  { slug: "english", label: "English", emoji: "🎤", color: "from-purple-500/40 to-pink-500/20" },
  { slug: "kpop", label: "K-Pop", emoji: "💜", color: "from-pink-500/40 to-purple-500/20" },
  { slug: "japanese", label: "Japanese", emoji: "🌸", color: "from-rose-500/40 to-red-500/20" },
  { slug: "love", label: "Love Songs", emoji: "❤️", color: "from-red-500/40 to-pink-500/20" },
  { slug: "rock", label: "Rock", emoji: "🎸", color: "from-amber-500/40 to-red-500/20" },
  { slug: "classic", label: "Classic", emoji: "🎼", color: "from-yellow-500/40 to-amber-500/20" },
  { slug: "disney", label: "Disney", emoji: "✨", color: "from-cyan-500/40 to-blue-500/20" },
];

const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

export const SONGS: Song[] = [
  { id: "2Vv-BfVoq4g", title: "Perfect (Karaoke Version)", artist: "Ed Sheeran", channel: "Sing King", duration: "4:23", views: "128M", publishedAt: "2019", thumbnail: thumb("2Vv-BfVoq4g"), category: "english" },
  { id: "YQHsXMglC9A", title: "Hello (Karaoke Version)", artist: "Adele", channel: "Sing King", duration: "4:55", views: "95M", publishedAt: "2018", thumbnail: thumb("YQHsXMglC9A"), category: "english" },
  { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody (Karaoke)", artist: "Queen", channel: "Karaoke Version", duration: "5:59", views: "210M", publishedAt: "2017", thumbnail: thumb("fJ9rUzIMcZQ"), category: "rock" },
  { id: "hLQl3WQQoQ0", title: "Someone Like You (Karaoke)", artist: "Adele", channel: "Sing King", duration: "4:45", views: "88M", publishedAt: "2016", thumbnail: thumb("hLQl3WQQoQ0"), category: "love" },
  { id: "kJQP7kiw5Fk", title: "Despacito (Karaoke)", artist: "Luis Fonsi", channel: "KaraFun", duration: "3:48", views: "412M", publishedAt: "2017", thumbnail: thumb("kJQP7kiw5Fk"), category: "trending" },
  { id: "9bZkp7q19f0", title: "Gangnam Style (Karaoke)", artist: "PSY", channel: "KaraFun", duration: "3:39", views: "180M", publishedAt: "2015", thumbnail: thumb("9bZkp7q19f0"), category: "kpop" },
  { id: "RgKAFK5djSk", title: "See You Again (Karaoke)", artist: "Wiz Khalifa", channel: "Sing King", duration: "3:57", views: "76M", publishedAt: "2019", thumbnail: thumb("RgKAFK5djSk"), category: "trending" },
  { id: "OPf0YbXqDm0", title: "Uptown Funk (Karaoke)", artist: "Mark Ronson", channel: "Sing King", duration: "4:30", views: "65M", publishedAt: "2018", thumbnail: thumb("OPf0YbXqDm0"), category: "english" },
  { id: "JGwWNGJdvx8", title: "Shape of You (Karaoke)", artist: "Ed Sheeran", channel: "Sing King", duration: "3:53", views: "142M", publishedAt: "2018", thumbnail: thumb("JGwWNGJdvx8"), category: "trending" },
  { id: "CevxZvSJLk8", title: "Roar (Karaoke)", artist: "Katy Perry", channel: "KaraFun", duration: "3:43", views: "44M", publishedAt: "2016", thumbnail: thumb("CevxZvSJLk8"), category: "english" },
  { id: "60ItHLz5WEA", title: "Faded (Karaoke)", artist: "Alan Walker", channel: "Sing King", duration: "3:32", views: "98M", publishedAt: "2017", thumbnail: thumb("60ItHLz5WEA"), category: "trending" },
  { id: "papuvlVeZg8", title: "Kahit Maputi Na Ang Buhok Ko (Karaoke)", artist: "Rey Valera", channel: "Magic Sing", duration: "4:12", views: "12M", publishedAt: "2020", thumbnail: thumb("papuvlVeZg8"), category: "opm" },
  { id: "3AtDnEC4zak", title: "We Are the World (Karaoke)", artist: "USA for Africa", channel: "Karaoke Version", duration: "7:02", views: "8M", publishedAt: "2015", thumbnail: thumb("3AtDnEC4zak"), category: "classic" },
  { id: "L_jWHffIx5E", title: "Smells Like Teen Spirit (Karaoke)", artist: "Nirvana", channel: "KaraFun", duration: "5:01", views: "22M", publishedAt: "2019", thumbnail: thumb("L_jWHffIx5E"), category: "rock" },
  { id: "L0MK7qz13bU", title: "Let It Go (Karaoke)", artist: "Idina Menzel", channel: "Sing King", duration: "3:44", views: "55M", publishedAt: "2017", thumbnail: thumb("L0MK7qz13bU"), category: "disney" },
  { id: "ZbZSe6N_BXs", title: "Happy (Karaoke)", artist: "Pharrell Williams", channel: "Sing King", duration: "3:53", views: "39M", publishedAt: "2016", thumbnail: thumb("ZbZSe6N_BXs"), category: "trending" },
  { id: "SlPhMPnQ58k", title: "Sakura Sakura (Karaoke)", artist: "Traditional", channel: "Japan Karaoke", duration: "3:20", views: "3M", publishedAt: "2020", thumbnail: thumb("SlPhMPnQ58k"), category: "japanese" },
  { id: "gdZLi9oWNZg", title: "Dynamite (Karaoke)", artist: "BTS", channel: "KaraFun", duration: "3:19", views: "60M", publishedAt: "2020", thumbnail: thumb("gdZLi9oWNZg"), category: "kpop" },
  { id: "PIh2xe4jnpk", title: "My Way (Karaoke)", artist: "Frank Sinatra", channel: "Karaoke Version", duration: "4:35", views: "18M", publishedAt: "2015", thumbnail: thumb("PIh2xe4jnpk"), category: "classic" },
  { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up (Karaoke)", artist: "Rick Astley", channel: "Sing King", duration: "3:33", views: "150M", publishedAt: "2016", thumbnail: thumb("dQw4w9WgXcQ"), category: "classic" },
];

export function searchSongs(query: string): Song[] {
  const q = query.trim().toLowerCase();
  if (!q) return SONGS;
  return SONGS.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      s.channel.toLowerCase().includes(q),
  );
}

export function songsByCategory(cat: Category): Song[] {
  if (cat === "trending") return SONGS.slice(0, 10);
  return SONGS.filter((s) => s.category === cat);
}

export function getSong(id: string): Song | undefined {
  return SONGS.find((s) => s.id === id);
}

export function smartSuggestions(query: string): string[] {
  const q = query.trim();
  if (!q) return ["Perfect", "Bohemian Rhapsody", "My Way", "Hello", "Dynamite"];
  return [
    `${q} Karaoke`,
    `${q} Karaoke Version`,
    `${q} Minus One`,
    `${q} Female Key`,
    `${q} Male Key`,
  ];
}

export function durationToSeconds(d: string): number {
  const [m, s] = d.split(":").map(Number);
  return m * 60 + (s || 0);
}
