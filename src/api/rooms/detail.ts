import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRoom } from '../_lib/roomStore';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const code = ((req.query.code as string) || '').toUpperCase();
  const roomState = getRoom(code);

  if (!roomState) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const currentTrack = roomState.queue.find((q) => q.status === 'playing') || null;

  return res.status(200).json({
    room: roomState.room,
    queue: roomState.queue,
    guests: roomState.guests,
    currentTrack,
    recentCheers: roomState.recentCheers,
    lastActionTimestamp: roomState.lastActionTimestamp,
  });
}
