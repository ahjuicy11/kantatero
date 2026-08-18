import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, QueueItem, ConnectedGuest, CheerEvent, WsMessage, RoomSettings } from '../types';
import { playSoundEffect } from '../lib/audioEffects';
import { trackEvent } from '../lib/analytics';

interface UseRoomRealtimeProps {
  roomCode: string;
  role: 'host' | 'remote';
  guestName: string;
  guestId?: string;
  onRoomEnded?: () => void;
}

export function useRoomRealtime({
  roomCode,
  role,
  guestName,
  guestId,
  onRoomEnded,
}: UseRoomRealtimeProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [guests, setGuests] = useState<ConnectedGuest[]>([]);
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [recentCheers, setRecentCheers] = useState<CheerEvent[]>([]);
  const [lastPlayerCommand, setLastPlayerCommand] = useState<{ command: string; value?: any; timestamp: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pollIntervalRef = useRef<any>(null);
  const isWsModeRef = useRef<boolean>(false);

  // HTTP Fallback state sync for Serverless (Vercel)
  const fetchRoomStateHttp = useCallback(async () => {
    if (!roomCode) return;
    try {
      const res = await fetch(`/api/rooms/${roomCode.toUpperCase()}`);
      if (res.ok) {
        const data = await res.json();
        setRoom(data.room);
        setQueue(data.queue || []);
        setGuests(data.guests || []);
        setCurrentTrack(data.currentTrack || null);
        if (data.recentCheers && Array.isArray(data.recentCheers) && data.recentCheers.length > 0) {
          setRecentCheers((prev) => {
            const seen = new Set(prev.map((c) => c.id));
            const newCheers = data.recentCheers.filter((c: CheerEvent) => !seen.has(c.id));
            if (newCheers.length > 0) {
              newCheers.forEach((c: CheerEvent) => playSoundEffect(c.type));
              return [...prev.slice(-15), ...newCheers];
            }
            return prev;
          });
        }
        setIsConnected(true);
      } else if (res.status === 404) {
        if (onRoomEnded) onRoomEnded();
      }
    } catch (e) {
      // Offline or network lag
    }
  }, [roomCode, onRoomEnded]);

  // Dispatch action via HTTP POST for Vercel Serverless
  const sendHttpAction = useCallback(
    async (payload: any) => {
      if (!roomCode) return;
      try {
        const res = await fetch(`/api/rooms/${roomCode.toUpperCase()}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.room) setRoom(data.room);
          if (data.queue) setQueue(data.queue);
          if (data.guests) setGuests(data.guests);
          if (data.currentTrack !== undefined) setCurrentTrack(data.currentTrack);
        }
      } catch (e) {
        console.warn('HTTP action dispatch fallback error:', e);
      }
    },
    [roomCode]
  );

  const connect = useCallback(() => {
    if (!roomCode) return;

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        isWsModeRef.current = true;
        setErrorMessage(null);
        // Join Room
        const joinMsg: WsMessage = {
          type: 'join_room',
          roomCode: roomCode.toUpperCase(),
          role,
          guestName,
          guestId,
        };
        ws.send(JSON.stringify(joinMsg));

        trackEvent('karaoke_room_joined', {
          roomCode: roomCode.toUpperCase(),
          role,
          guestName,
        });
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data);

          if (msg.type === 'room_state') {
            setRoom(msg.room);
            setQueue(msg.queue);
            setGuests(msg.guests);
            setCurrentTrack(msg.currentTrack);
          } else if (msg.type === 'cheer_received') {
            playSoundEffect(msg.cheer.type);
            setRecentCheers((prev) => [...prev.slice(-15), msg.cheer]);
          } else if (msg.type === 'player_command') {
            setLastPlayerCommand({ command: msg.command, value: msg.value, timestamp: Date.now() });
          } else if (msg.type === 'room_ended') {
            if (onRoomEnded) onRoomEnded();
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message);
            setTimeout(() => setErrorMessage(null), 5000);
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onclose = () => {
        isWsModeRef.current = false;
        // Fallback to HTTP polling if WS is unavailable (e.g. on serverless Vercel)
        fetchRoomStateHttp();
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 4000);
      };

      ws.onerror = () => {
        isWsModeRef.current = false;
        // WS error - HTTP fallback takes over
        fetchRoomStateHttp();
      };
    } catch (e) {
      isWsModeRef.current = false;
      fetchRoomStateHttp();
    }
  }, [roomCode, role, guestName, guestId, onRoomEnded, fetchRoomStateHttp]);

  useEffect(() => {
    connect();
    fetchRoomStateHttp();

    // Start HTTP polling interval as high-reliability backup for Vercel Serverless
    pollIntervalRef.current = setInterval(() => {
      if (!isWsModeRef.current) {
        fetchRoomStateHttp();
      }
    }, 2500);

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect, fetchRoomStateHttp]);

  const send = useCallback(
    (msg: WsMessage) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify(msg));
      } else {
        // Fallback via HTTP REST action for serverless
        sendHttpAction(msg);
      }
    },
    [sendHttpAction]
  );

  const addToQueue = useCallback(
    (track: Omit<QueueItem, 'id' | 'room_code' | 'created_at' | 'status'>) => {
      send({
        type: 'add_to_queue',
        roomCode: roomCode.toUpperCase(),
        track,
      });
      playSoundEffect('success');

      trackEvent('karaoke_song_reserved', {
        roomCode: roomCode.toUpperCase(),
        title: track.title,
        video_id: track.video_id,
        added_by: track.added_by,
      });
    },
    [send, roomCode]
  );

  const updateStatus = useCallback(
    (queueItemId: string, status: 'playing' | 'queued' | 'played') => {
      send({
        type: 'update_status',
        roomCode: roomCode.toUpperCase(),
        queueItemId,
        status,
      });
    },
    [send, roomCode]
  );

  const skipTrack = useCallback(
    (requesterName?: string) => {
      send({
        type: 'skip_track',
        roomCode: roomCode.toUpperCase(),
        requesterName,
      });

      trackEvent('karaoke_song_skipped', {
        roomCode: roomCode.toUpperCase(),
        requester: requesterName || guestName,
      });
    },
    [send, roomCode, guestName]
  );

  const replayTrack = useCallback(() => {
    send({
      type: 'replay_track',
      roomCode: roomCode.toUpperCase(),
    });
  }, [send, roomCode]);

  const playPause = useCallback(
    (isPlaying: boolean) => {
      send({
        type: 'play_pause',
        roomCode: roomCode.toUpperCase(),
        isPlaying,
      });

      trackEvent('karaoke_playback_toggled', {
        roomCode: roomCode.toUpperCase(),
        isPlaying,
      });
    },
    [send, roomCode]
  );

  const reorderQueue = useCallback(
    (queueItemIds: string[]) => {
      send({
        type: 'reorder_queue',
        roomCode: roomCode.toUpperCase(),
        queueItemIds,
      });
    },
    [send, roomCode]
  );

  const removeFromQueue = useCallback(
    (queueItemId: string, requesterName?: string) => {
      send({
        type: 'remove_from_queue',
        roomCode: roomCode.toUpperCase(),
        queueItemId,
        requesterName,
      });
    },
    [send, roomCode]
  );

  const clearQueue = useCallback(() => {
    send({
      type: 'clear_queue',
      roomCode: roomCode.toUpperCase(),
    });
  }, [send, roomCode]);

  const updateSettings = useCallback(
    (settings: Partial<RoomSettings>) => {
      send({
        type: 'update_settings',
        roomCode: roomCode.toUpperCase(),
        settings,
      });
    },
    [send, roomCode]
  );

  const sendCheer = useCallback(
    (type: CheerEvent['type'], senderName: string, x?: number, y?: number) => {
      send({
        type: 'send_cheer',
        roomCode: roomCode.toUpperCase(),
        cheer: {
          type,
          senderName,
          x,
          y,
        },
      });
      playSoundEffect(type);

      trackEvent('karaoke_cheer_sent', {
        roomCode: roomCode.toUpperCase(),
        cheerType: type,
        senderName,
      });
    },
    [send, roomCode]
  );

  const endRoom = useCallback(() => {
    send({
      type: 'end_room',
      roomCode: roomCode.toUpperCase(),
    });
  }, [send, roomCode]);

  const reportPlayerState = useCallback(
    (isPlaying: boolean, currentTime?: number, duration?: number) => {
      send({
        type: 'player_state_changed',
        isPlaying,
        currentTime,
        duration,
      });
    },
    [send]
  );

  return {
    room,
    queue,
    guests,
    currentTrack,
    isConnected,
    recentCheers,
    lastPlayerCommand,
    errorMessage,
    addToQueue,
    updateStatus,
    skipTrack,
    replayTrack,
    playPause,
    reorderQueue,
    removeFromQueue,
    clearQueue,
    updateSettings,
    sendCheer,
    endRoom,
    reportPlayerState,
  };
}
