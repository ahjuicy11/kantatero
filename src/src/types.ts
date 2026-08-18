export interface RoomSettings {
  max_songs_per_guest: number;
  autoplay: boolean;
  allow_guest_skip: boolean;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  created_at: string;
  settings: RoomSettings;
  current_track_id?: string | null;
  is_playing?: boolean;
}

export interface QueueItem {
  id: string;
  room_code: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  duration?: string;
  added_by: string;
  status: 'playing' | 'queued' | 'played';
  created_at: string;
}

export interface SearchTrack {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  duration?: string;
  category?: string;
}

export interface ConnectedGuest {
  id: string;
  name: string;
  role: 'host' | 'remote';
  joined_at: string;
}

export type CheerType = 'applause' | 'airhorn' | 'cheer' | 'fire' | 'heart' | 'mic_drop' | 'wow';

export interface CheerEvent {
  id: string;
  type: CheerType;
  senderName: string;
  timestamp: number;
  x?: number;
  y?: number;
}

export type WsMessage =
  | { type: 'join_room'; roomCode: string; role: 'host' | 'remote'; guestName: string; guestId?: string }
  | { type: 'room_state'; room: Room; queue: QueueItem[]; guests: ConnectedGuest[]; currentTrack: QueueItem | null }
  | { type: 'add_to_queue'; roomCode: string; track: Omit<QueueItem, 'id' | 'room_code' | 'created_at' | 'status'> }
  | { type: 'update_status'; roomCode: string; queueItemId: string; status: 'playing' | 'queued' | 'played' }
  | { type: 'skip_track'; roomCode: string; requesterName?: string }
  | { type: 'replay_track'; roomCode: string }
  | { type: 'play_pause'; roomCode: string; isPlaying: boolean }
  | { type: 'reorder_queue'; roomCode: string; queueItemIds: string[] }
  | { type: 'remove_from_queue'; roomCode: string; queueItemId: string; requesterName?: string }
  | { type: 'clear_queue'; roomCode: string }
  | { type: 'update_settings'; roomCode: string; settings: Partial<RoomSettings> }
  | { type: 'send_cheer'; roomCode: string; cheer: Omit<CheerEvent, 'id' | 'timestamp'> }
  | { type: 'cheer_received'; cheer: CheerEvent }
  | { type: 'player_command'; command: 'play' | 'pause' | 'skip' | 'replay' | 'seek' | 'volume'; value?: any }
  | { type: 'player_state_changed'; isPlaying: boolean; currentTime?: number; duration?: number }
  | { type: 'end_room'; roomCode: string }
  | { type: 'room_ended'; message: string }
  | { type: 'error'; message: string };
