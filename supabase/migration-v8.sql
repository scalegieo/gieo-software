-- GIEO migration v8: catch-up — applies everything from v4, v5 and v7 in one go
-- Run in Supabase SQL Editor (safe to re-run)

-- Team logins
INSERT INTO profiles (id, role, name) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'admin', 'Reda'),
  ('a1000005-0000-4000-8000-000000000005', 'member', 'Lydia'),
  ('a1000006-0000-4000-8000-000000000006', 'member', 'Sulay'),
  ('a1000007-0000-4000-8000-000000000007', 'member', 'Ethan'),
  ('a1000008-0000-4000-8000-000000000008', 'member', 'Jacob'),
  ('a1000009-0000-4000-8000-000000000009', 'member', 'Dolev'),
  ('a1000010-0000-4000-8000-000000000010', 'member', 'Shalom'),
  ('a1000011-0000-4000-8000-000000000011', 'member', 'Daaron'),
  ('a1000012-0000-4000-8000-000000000012', 'member', 'Quentin')
ON CONFLICT (id) DO NOTHING;

-- AI usage (agentic tokens)
ALTER TABLE ai_usage_daily
  ADD COLUMN IF NOT EXISTS agentic_token_count INT NOT NULL DEFAULT 0;

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';

-- Team chat per business
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'user';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';

-- Whiteboard / notepad per business
CREATE TABLE IF NOT EXISTS whiteboard_items (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  x FLOAT NOT NULL DEFAULT 0,
  y FLOAT NOT NULL DEFAULT 0,
  width FLOAT NOT NULL DEFAULT 220,
  height FLOAT NOT NULL DEFAULT 140,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'amber',
  target_id TEXT REFERENCES whiteboard_items(id) ON DELETE SET NULL,
  business TEXT NOT NULL DEFAULT 'gieo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE whiteboard_items ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';
ALTER TABLE whiteboard_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all whiteboard_items" ON whiteboard_items;
CREATE POLICY "anon all whiteboard_items" ON whiteboard_items FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated all whiteboard_items" ON whiteboard_items;
CREATE POLICY "authenticated all whiteboard_items" ON whiteboard_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Shared client hours / retainer
CREATE TABLE IF NOT EXISTS client_profiles (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all client_profiles" ON client_profiles;
CREATE POLICY "anon all client_profiles" ON client_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "authenticated all client_profiles" ON client_profiles;
CREATE POLICY "authenticated all client_profiles" ON client_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Realtime for chat + whiteboard
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE messages; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_items; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
