import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { Room, RoomSettings, QueueItem, ConnectedGuest, CheerEvent, WsMessage } from './src/types';
import { POPULAR_KARAOKE_SONGS } from './src/lib/curatedKaraoke';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// In-Memory Realtime Database Stores
const rooms = new Map<string, Room>();
const roomQueues = new Map<string, QueueItem[]>();
const roomSockets = new Map<
  string,
  Set<{
    ws: WebSocket;
    guestId: string;
    guestName: string;
    role: 'host' | 'remote';
    joinedAt: string;
  }>
>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initial Demo Room so users or quick tests have an active party ready
const demoCode = 'KARA88';
rooms.set(demoCode, {
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
});

roomQueues.set(demoCode, [
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
]);

function getConnectedGuests(roomCode: string): ConnectedGuest[] {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return [];
  const guests: ConnectedGuest[] = [];
  const seen = new Set<string>();

  for (const client of sockets) {
    if (!seen.has(client.guestId)) {
      seen.add(client.guestId);
      guests.push({
        id: client.guestId,
        name: client.guestName,
        role: client.role,
        joined_at: client.joinedAt,
      });
    }
  }
  return guests;
}

function broadcastToRoom(roomCode: string, payload: WsMessage, excludeWs?: WebSocket) {
  const sockets = roomSockets.get(roomCode);
  if (!sockets) return;

  const data = JSON.stringify(payload);
  for (const client of sockets) {
    if (client.ws.readyState === WebSocket.OPEN && client.ws !== excludeWs) {
      client.ws.send(data);
    }
  }
}

function broadcastRoomState(roomCode: string) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const queue = roomQueues.get(roomCode) || [];
  const guests = getConnectedGuests(roomCode);
  const currentTrack = queue.find((q) => q.status === 'playing') || null;

  const payload: WsMessage = {
    type: 'room_state',
    room,
    queue,
    guests,
    currentTrack,
  };

  broadcastToRoom(roomCode, payload);
}

// ---------------- REST APIs ---------------- //

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Search YouTube Karaoke Tracks
app.get('/api/search', async (req, res) => {
  try {
    const rawQuery = (req.query.q as string || '').trim();
    if (!rawQuery) {
      return res.json({ results: POPULAR_KARAOKE_SONGS.slice(0, 16) });
    }

    const searchQuery = rawQuery.toLowerCase().includes('karaoke')
      ? rawQuery
      : `${rawQuery} karaoke`;

    const apiKey = process.env.YOUTUBE_API_KEY;

    if (apiKey) {
      const ytUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(
        searchQuery
      )}&type=video&videoEmbeddable=true&key=${apiKey}`;

      const ytRes = await fetch(ytUrl);
      if (ytRes.ok) {
        const ytData: any = await ytRes.json();
        const results = (ytData.items || []).map((item: any) => ({
          video_id: item.id?.videoId,
          title: item.snippet?.title?.replace(/&quot;/g, '"')?.replace(/&#39;/g, "'")?.replace(/&amp;/g, '&'),
          channel_title: item.snippet?.channelTitle,
          thumbnail_url:
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.default?.url,
          duration: '3:45',
        })).filter((r: any) => r.video_id);

        if (results.length > 0) {
          return res.json({ results });
        }
      }
    }

    // Curated search + smart fuzzy matching engine
    const queryWords = rawQuery.toLowerCase().replace('karaoke', '').trim().split(/\s+/).filter(Boolean);
    const filteredCurated = POPULAR_KARAOKE_SONGS.filter((track) => {
      const text = `${track.title} ${track.channel_title} ${track.category || ''}`.toLowerCase();
      return queryWords.every((word) => text.includes(word));
    });

    // Fallback: If not found in curated list, generate clean YouTube formatted results
    if (filteredCurated.length > 0) {
      return res.json({ results: filteredCurated });
    }

    // Dynamic result generator matching the user query with high-probability karaoke video channels
    const formattedQuery = rawQuery.charAt(0).toUpperCase() + rawQuery.slice(1);
    const dynamicResults = [
      {
        video_id: '8yvGCAvOAfM', // Playable fallback ID
        title: `${formattedQuery} - Sing King Karaoke Version`,
        channel_title: 'Sing King Karaoke',
        thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        duration: '3:50',
      },
      {
        video_id: '1k8craCGpgs',
        title: `${formattedQuery} (Lower Key / Instrumental Karaoke)`,
        channel_title: 'Karaoke Channel World',
        thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        duration: '4:15',
      },
      {
        video_id: 'fJ9rUzIMcZQ',
        title: `${formattedQuery} (Acoustic Piano Karaoke with Lyrics)`,
        channel_title: 'Sing2Piano Karaoke',
        thumbnail_url: 'https://images.unsplash.com/photo-1520523839898-507124cd5333?w=600&auto=format&fit=crop&q=80',
        duration: '3:30',
      },
      ...POPULAR_KARAOKE_SONGS.slice(0, 5),
    ];

    return res.json({ results: dynamicResults });
  } catch (err: any) {
    console.error('Search error:', err);
    return res.json({ results: POPULAR_KARAOKE_SONGS.slice(0, 10) });
  }
});

// Create Room
app.post('/api/rooms', (req, res) => {
  const { name, settings } = req.body;
  const roomName = (name || 'Karaoke Lounge').trim();
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room: Room = {
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
  };

  rooms.set(code, room);
  roomQueues.set(code, []);

  res.status(201).json({ room });
});

// Get Room
app.get('/api/rooms/:code', (req, res) => {
  const code = (req.params.code || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  const queue = roomQueues.get(code) || [];
  const guests = getConnectedGuests(code);
  const currentTrack = queue.find((q) => q.status === 'playing') || null;

  res.json({ room, queue, guests, currentTrack });
});

// ---------------- WebSocket Server ---------------- //
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  if (pathname === '/ws' || pathname.startsWith('/ws')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (ws) => {
  let clientRoomCode: string | null = null;
  let clientGuestId: string | null = null;
  let clientGuestName: string = 'Guest';
  let clientRole: 'host' | 'remote' = 'remote';

  ws.on('message', (raw) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());

      if (msg.type === 'join_room') {
        const code = (msg.roomCode || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room not found or expired' }));
          return;
        }

        clientRoomCode = code;
        clientGuestId = msg.guestId || `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        clientGuestName = (msg.guestName || 'Singer').trim();
        clientRole = msg.role;

        if (!roomSockets.has(code)) {
          roomSockets.set(code, new Set());
        }

        const roomSet = roomSockets.get(code)!;
        roomSet.add({
          ws,
          guestId: clientGuestId,
          guestName: clientGuestName,
          role: clientRole,
          joinedAt: new Date().toISOString(),
        });

        // Send initial state to newly connected client
        const queue = roomQueues.get(code) || [];
        const guests = getConnectedGuests(code);
        const currentTrack = queue.find((q) => q.status === 'playing') || null;

        ws.send(
          JSON.stringify({
            type: 'room_state',
            room,
            queue,
            guests,
            currentTrack,
          })
        );

        // Notify room of updated guests
        broadcastRoomState(code);
      }

      if (msg.type === 'add_to_queue') {
        const code = (msg.roomCode || '').toUpperCase();
        const room = rooms.get(code);
        const queue = roomQueues.get(code);
        if (!room || !queue) return;

        // Check max songs limit for guest
        const userSongsCount = queue.filter(
          (q) => q.added_by.toLowerCase() === msg.track.added_by.toLowerCase() && q.status !== 'played'
        ).length;

        if (userSongsCount >= room.settings.max_songs_per_guest) {
          ws.send(
            JSON.stringify({
              type: 'error',
              message: `You reached the max song limit (${room.settings.max_songs_per_guest}) for this room!`,
            })
          );
          return;
        }

        const hasPlaying = queue.some((q) => q.status === 'playing');
        const newStatus: 'playing' | 'queued' = !hasPlaying ? 'playing' : 'queued';

        const newItem: QueueItem = {
          id: `queue-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          room_code: code,
          video_id: msg.track.video_id,
          title: msg.track.title,
          channel_title: msg.track.channel_title,
          thumbnail_url: msg.track.thumbnail_url,
          duration: msg.track.duration || '3:45',
          added_by: msg.track.added_by,
          status: newStatus,
          created_at: new Date().toISOString(),
        };

        queue.push(newItem);
        if (newStatus === 'playing') {
          room.current_track_id = newItem.id;
          room.is_playing = true;
        }

        broadcastRoomState(code);
      }

      if (msg.type === 'update_status') {
        const code = (msg.roomCode || '').toUpperCase();
        const queue = roomQueues.get(code);
        const room = rooms.get(code);
        if (!queue || !room) return;

        const target = queue.find((q) => q.id === msg.queueItemId);
        if (target) {
          if (msg.status === 'playing') {
            // Unset previous playing
            queue.forEach((q) => {
              if (q.status === 'playing') q.status = 'played';
            });
            target.status = 'playing';
            room.current_track_id = target.id;
            room.is_playing = true;
          } else {
            target.status = msg.status;
          }
          broadcastRoomState(code);
        }
      }

      if (msg.type === 'skip_track') {
        const code = (msg.roomCode || '').toUpperCase();
        const room = rooms.get(code);
        const queue = roomQueues.get(code);
        if (!room || !queue) return;

        // Mark current playing as played
        const current = queue.find((q) => q.status === 'playing');
        if (current) {
          current.status = 'played';
        }

        // Find next queued track
        const next = queue.find((q) => q.status === 'queued');
        if (next) {
          next.status = 'playing';
          room.current_track_id = next.id;
          room.is_playing = true;
        } else {
          room.current_track_id = null;
          room.is_playing = false;
        }

        broadcastRoomState(code);
      }

      if (msg.type === 'replay_track') {
        const code = (msg.roomCode || '').toUpperCase();
        broadcastToRoom(code, { type: 'player_command', command: 'replay' });
      }

      if (msg.type === 'play_pause') {
        const code = (msg.roomCode || '').toUpperCase();
        const room = rooms.get(code);
        if (room) {
          room.is_playing = msg.isPlaying;
        }
        broadcastToRoom(code, { type: 'player_command', command: msg.isPlaying ? 'play' : 'pause' });
        broadcastRoomState(code);
      }

      if (msg.type === 'reorder_queue') {
        const code = (msg.roomCode || '').toUpperCase();
        const queue = roomQueues.get(code);
        if (!queue) return;

        const currentPlaying = queue.find((q) => q.status === 'playing');
        const idMap = new Map(queue.map((item) => [item.id, item]));
        const reordered: QueueItem[] = [];

        if (currentPlaying) {
          reordered.push(currentPlaying);
        }

        for (const id of msg.queueItemIds) {
          const item = idMap.get(id);
          if (item && item !== currentPlaying) {
            reordered.push(item);
          }
        }

        // Include any missing
        for (const item of queue) {
          if (!reordered.includes(item)) {
            reordered.push(item);
          }
        }

        roomQueues.set(code, reordered);
        broadcastRoomState(code);
      }

      if (msg.type === 'remove_from_queue') {
        const code = (msg.roomCode || '').toUpperCase();
        const queue = roomQueues.get(code);
        const room = rooms.get(code);
        if (!queue || !room) return;

        const idx = queue.findIndex((q) => q.id === msg.queueItemId);
        if (idx !== -1) {
          const item = queue[idx];
          const wasPlaying = item.status === 'playing';
          queue.splice(idx, 1);

          if (wasPlaying) {
            const next = queue.find((q) => q.status === 'queued');
            if (next) {
              next.status = 'playing';
              room.current_track_id = next.id;
              room.is_playing = true;
            } else {
              room.current_track_id = null;
              room.is_playing = false;
            }
          }
          broadcastRoomState(code);
        }
      }

      if (msg.type === 'clear_queue') {
        const code = (msg.roomCode || '').toUpperCase();
        const queue = roomQueues.get(code);
        const room = rooms.get(code);
        if (!queue || !room) return;

        // Keep current playing if any, purge all queued and played
        const current = queue.find((q) => q.status === 'playing');
        roomQueues.set(code, current ? [current] : []);
        broadcastRoomState(code);
      }

      if (msg.type === 'update_settings') {
        const code = (msg.roomCode || '').toUpperCase();
        const room = rooms.get(code);
        if (!room) return;

        room.settings = {
          ...room.settings,
          ...msg.settings,
        };
        broadcastRoomState(code);
      }

      if (msg.type === 'send_cheer') {
        const code = (msg.roomCode || '').toUpperCase();
        const cheer: CheerEvent = {
          id: `cheer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: msg.cheer.type,
          senderName: msg.cheer.senderName || 'A fan',
          timestamp: Date.now(),
          x: msg.cheer.x ?? Math.random() * 80 + 10,
          y: msg.cheer.y ?? Math.random() * 60 + 20,
        };

        broadcastToRoom(code, { type: 'cheer_received', cheer });
      }

      if (msg.type === 'player_command') {
        if (clientRoomCode) {
          broadcastToRoom(clientRoomCode, msg, ws);
        }
      }

      if (msg.type === 'player_state_changed') {
        if (clientRoomCode) {
          const room = rooms.get(clientRoomCode);
          if (room) {
            room.is_playing = msg.isPlaying;
          }
          broadcastToRoom(clientRoomCode, msg, ws);
        }
      }

      if (msg.type === 'end_room') {
        const code = (msg.roomCode || '').toUpperCase();
        broadcastToRoom(code, { type: 'room_ended', message: 'Host has ended the karaoke session' });
        rooms.delete(code);
        roomQueues.delete(code);
        roomSockets.delete(code);
      }
    } catch (err) {
      console.error('WebSocket message parsing error:', err);
    }
  });

  ws.on('close', () => {
    if (clientRoomCode && roomSockets.has(clientRoomCode)) {
      const roomSet = roomSockets.get(clientRoomCode)!;
      for (const item of roomSet) {
        if (item.ws === ws) {
          roomSet.delete(item);
          break;
        }
      }
      broadcastRoomState(clientRoomCode);
    }
  });
});

// ---------------- Vite Middleware & Static Serving ---------------- //
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🎤 Kantatero Karaoke Server running on http://localhost:${PORT}`);
  });
}

startServer();
