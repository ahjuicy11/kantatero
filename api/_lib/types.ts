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
  current_track_id: string | null;
  is_playing: boolean;
}

export interface QueueItem {
  id: string;
  room_code: string;
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  duration: string;
  added_by: string;
  status: 'playing' | 'queued' | 'played';
  created_at: string;
}

export interface ConnectedGuest {
  id: string;
  name: string;
  role: 'host' | 'remote';
  joined_at: string;
}

export interface CheerEvent {
  id: string;
  type: string;
  senderName: string;
  timestamp: number;
  x?: number;
  y?: number;
}
