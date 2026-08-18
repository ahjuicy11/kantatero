import { Room, QueueItem, ConnectedGuest, CheerEvent } from '../../src/types';

export interface RoomStateHolder {
  room: Room;
  queue: QueueItem[];
  guests: ConnectedGuest[];
  recentCheers: CheerEvent[];
  lastActionTimestamp: number;
}

// Global in-memory cache for serverless invocation / Node instance
const globalRooms = new Map<string, RoomStateHolder>();

// Seed default demo room
const demoCode = 'KARA88';
if (!globalRooms.has(demoCode)) {
  globalRooms.set(demoCode, {
    room: {
      id: 'demo-room-id',
      code: demoCode,
      name: 'Kantatero Main Lounge',
      created_at: new Date().toISOString(),
      settings: {
        max_songs_per_guest: 10,
        autoplay: true,
        allow_guest_skip: true,
      },
      current_track_id: null,
      is_playing: false,
    },
    queue: [
      {
        id: 'demo-q-1',
        room_code: demoCode,
        video_id: '8yvGCAvOAfM',
        title: 'Queen - Bohemian Rhapsody (Karaoke Version)',
        channel_title: 'Sing King',
        thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: '5:55',
        added_by: 'Host Alex',
        status: 'playing',
        created_at: new Date().toISOString(),
      },
      {
        id: 'demo-q-2',
        room_code: demoCode,
        video_id: '1k8craCGpgs',
        title: "Journey - Don't Stop Believin' (Karaoke Version)",
        channel_title: 'Sing King',
        thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        duration: '4:11',
        added_by: 'Sarah M.',
        status: 'queued',
        created_at: new Date(Date.now() + 1000).toISOString(),
      },
      {
        id: 'demo-q-3',
        room_code: demoCode,
        video_id: '450p7goxZqg',
        title: 'John Legend - All Of Me (Karaoke Version)',
        channel_title: 'Sing King',
        thumbnail_url: 'https://images.unsplash.com/photo-1520523839898-507124cd5333?w=600&auto=format&fit=crop&q=80',
        duration: '4:30',
        added_by: 'David K.',
        status: 'queued',
        created_at: new Date(Date.now() + 2000).toISOString(),
      },
    ],
    guests: [
      {
        id: 'guest-host',
        name: 'Host Alex',
        role: 'host',
        joined_at: new Date().toISOString(),
      },
    ],
    recentCheers: [],
    lastActionTimestamp: Date.now(),
  });
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getRoom(code: string): RoomStateHolder | undefined {
  return globalRooms.get(code.toUpperCase());
}

export function setRoom(code: string, state: RoomStateHolder): void {
  globalRooms.set(code.toUpperCase(), state);
}

export function deleteRoom(code: string): void {
  globalRooms.delete(code.toUpperCase());
}
