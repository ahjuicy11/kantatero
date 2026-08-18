
-- Rooms: TV/PC hosts a room with a short join code
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rooms_code_idx ON public.rooms (code);

GRANT SELECT, INSERT, UPDATE ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms open read"   ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms open insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms open update" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);

-- Queue items reserved from any device
CREATE TABLE public.queue_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  title text NOT NULL,
  artist text,
  thumbnail_url text,
  duration_seconds int,
  reserved_by text,
  position double precision NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending | playing | played | skipped
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX queue_items_room_pos_idx ON public.queue_items (room_id, position);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_items TO anon, authenticated;
GRANT ALL ON public.queue_items TO service_role;
ALTER TABLE public.queue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue open read"   ON public.queue_items FOR SELECT USING (true);
CREATE POLICY "queue open insert" ON public.queue_items FOR INSERT WITH CHECK (true);
CREATE POLICY "queue open update" ON public.queue_items FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "queue open delete" ON public.queue_items FOR DELETE USING (true);

-- Player commands sent from remotes to the TV
CREATE TABLE public.player_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  command text NOT NULL, -- play | pause | next | prev | restart | seek
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX player_commands_room_idx ON public.player_commands (room_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.player_commands TO anon, authenticated;
GRANT ALL ON public.player_commands TO service_role;
ALTER TABLE public.player_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cmd open read"   ON public.player_commands FOR SELECT USING (true);
CREATE POLICY "cmd open insert" ON public.player_commands FOR INSERT WITH CHECK (true);
CREATE POLICY "cmd open delete" ON public.player_commands FOR DELETE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_commands;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
