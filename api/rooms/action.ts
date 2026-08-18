import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRoom, setRoom, deleteRoom } from '../_lib/roomStore';
import { QueueItem, CheerEvent } from '../_lib/types';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const code = ((req.query.code as string) || '').toUpperCase();
  const roomState = getRoom(code);

  if (!roomState) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const body = req.body || {};
  const actionType = body.type;

  roomState.lastActionTimestamp = Date.now();

  switch (actionType) {
    case 'join_room': {
      const guestId = body.guestId || `guest-${Date.now()}`;
      const guestName = (body.guestName || 'Singer').trim();
      const role = body.role || 'remote';

      if (!roomState.guests.some((g) => g.id === guestId)) {
        roomState.guests.push({
          id: guestId,
          name: guestName,
          role,
          joined_at: new Date().toISOString(),
        });
      }
      break;
    }

    case 'add_to_queue': {
      const track = body.track;
      if (!track) break;

      const userSongsCount = roomState.queue.filter(
        (q) => q.added_by.toLowerCase() === track.added_by.toLowerCase() && q.status !== 'played'
      ).length;

      if (userSongsCount >= roomState.room.settings.max_songs_per_guest) {
        return res.status(400).json({
          error: `Max song limit (${roomState.room.settings.max_songs_per_guest}) reached`,
        });
      }

      const hasPlaying = roomState.queue.some((q) => q.status === 'playing');
      const newStatus: 'playing' | 'queued' = !hasPlaying ? 'playing' : 'queued';

      const newItem: QueueItem = {
        id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        room_code: code,
        video_id: track.video_id,
        title: track.title,
        channel_title: track.channel_title,
        thumbnail_url: track.thumbnail_url,
        duration: track.duration || '3:45',
        added_by: track.added_by,
        status: newStatus,
        created_at: new Date().toISOString(),
      };

      roomState.queue.push(newItem);
      if (newStatus === 'playing') {
        roomState.room.current_track_id = newItem.id;
        roomState.room.is_playing = true;
      }
      break;
    }

    case 'skip_track': {
      const current = roomState.queue.find((q) => q.status === 'playing');
      if (current) {
        current.status = 'played';
      }
      const next = roomState.queue.find((q) => q.status === 'queued');
      if (next) {
        next.status = 'playing';
        roomState.room.current_track_id = next.id;
        roomState.room.is_playing = true;
      } else {
        roomState.room.current_track_id = null;
        roomState.room.is_playing = false;
      }
      break;
    }

    case 'play_pause': {
      roomState.room.is_playing = Boolean(body.isPlaying);
      break;
    }

    case 'remove_from_queue': {
      const idx = roomState.queue.findIndex((q) => q.id === body.queueItemId);
      if (idx !== -1) {
        const item = roomState.queue[idx];
        const wasPlaying = item.status === 'playing';
        roomState.queue.splice(idx, 1);

        if (wasPlaying) {
          const next = roomState.queue.find((q) => q.status === 'queued');
          if (next) {
            next.status = 'playing';
            roomState.room.current_track_id = next.id;
            roomState.room.is_playing = true;
          } else {
            roomState.room.current_track_id = null;
            roomState.room.is_playing = false;
          }
        }
      }
      break;
    }

    case 'reorder_queue': {
      const idMap = new Map(roomState.queue.map((item) => [item.id, item]));
      const currentPlaying = roomState.queue.find((q) => q.status === 'playing');
      const reordered: QueueItem[] = [];

      if (currentPlaying) reordered.push(currentPlaying);

      for (const id of body.queueItemIds || []) {
        const item = idMap.get(id);
        if (item && item !== currentPlaying) {
          reordered.push(item);
        }
      }
      for (const item of roomState.queue) {
        if (!reordered.includes(item)) reordered.push(item);
      }
      roomState.queue = reordered;
      break;
    }

    case 'clear_queue': {
      const current = roomState.queue.find((q) => q.status === 'playing');
      roomState.queue = current ? [current] : [];
      break;
    }

    case 'send_cheer': {
      const cheer: CheerEvent = {
        id: `cheer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: body.cheer?.type || 'clap',
        senderName: body.cheer?.senderName || 'A fan',
        timestamp: Date.now(),
        x: body.cheer?.x ?? Math.random() * 80 + 10,
        y: body.cheer?.y ?? Math.random() * 60 + 20,
      };
      roomState.recentCheers.push(cheer);
      if (roomState.recentCheers.length > 20) {
        roomState.recentCheers.shift();
      }
      break;
    }

    case 'update_settings': {
      if (body.settings) {
        roomState.room.settings = {
          ...roomState.room.settings,
          ...body.settings,
        };
      }
      break;
    }

    case 'end_room': {
      deleteRoom(code);
      return res.status(200).json({ success: true, message: 'Room ended' });
    }

    default:
      break;
  }

  setRoom(code, roomState);

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
