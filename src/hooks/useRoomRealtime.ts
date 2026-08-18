import { useEffect, useRef, useState, useCallback } from 'react';
import { Room, QueueItem, ConnectedGuest, CheerEvent, WsMessage, RoomSettings } from '../types';
import { playSoundEffect } from '../lib/audioEffects';

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

  const connect = useCallback(() => {
    if (!roomCode) return;

    if (socketRef.current) {
      try {
        socketRef.current.close();
      } catch (e) {}
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
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
      setIsConnected(false);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2500);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [roomCode, role, guestName, guestId, onRoomEnded]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((msg: WsMessage) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const addToQueue = useCallback(
    (track: Omit<QueueItem, 'id' | 'room_code' | 'created_at' | 'status'>) => {
      send({
        type: 'add_to_queue',
        roomCode: roomCode.toUpperCase(),
        track,
      });
      playSoundEffect('success');
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
    },
    [send, roomCode]
  );

  const replayTrack = useCallback(() => {
    send({
      type: 'replay_track',
      roomCode: roomCode.toUpperCase(),
    });
  }, [send, roomCode] );

  const playPause = useCallback(
    (isPlaying: boolean) => {
      send({
        type: 'play_pause',
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
