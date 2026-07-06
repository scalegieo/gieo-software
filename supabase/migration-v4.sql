-- GIEO migration v4: EBONICS agentic usage, task priority, whiteboard
-- Run in Supabase SQL Editor if upgrading an existing database

ALTER TABLE ai_usage_daily
  ADD COLUMN IF NOT EXISTS agentic_token_count INT NOT NULL DEFAULT 0;

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE whiteboard_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all whiteboard_items" ON whiteboard_items FOR ALL TO anon USING (true);
CREATE POLICY "authenticated all whiteboard_items" ON whiteboard_items FOR ALL TO authenticated USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE whiteboard_items;
