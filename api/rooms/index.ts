import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateRoomCode, getRoom, setRoom, RoomStateHolder } from '../_lib/roomStore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const { name, settings } = req.body || {};
    const roomName = (name || 'Karaoke Lounge').trim();

    let code = generateRoomCode();
    while (getRoom(code)) {
      code = generateRoomCode();
    }

    const state: RoomStateHolder = {
      room: {
        id: `room-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        code,
        name: roomName,
        created_at: new Date().toISOString(),
        settings: {
          max_songs_per_guest: settings?.max_songs_per_guest ?? 10,
          autoplay: settings?.autoplay ?? true,
          allow_guest_skip: settings?.allow_guest_skip ?? false,
        },
        current_track_id: null,
        is_playing: false,
      },
      queue: [],
      guests: [],
      recentCheers: [],
      lastActionTimestamp: Date.now(),
    };

    setRoom(code, state);

    return res.status(201).json({ room: state.room });
  }

  // GET returns info or demo room
  const demo = getRoom('KARA88');
  return res.status(200).json({ demoRoom: demo?.room });
}
