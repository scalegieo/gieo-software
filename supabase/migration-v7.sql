-- GIEO migration v7: new team logins + separate GIEO / Python chat, notes, whiteboard
-- Run in Supabase SQL Editor after migration-v6.sql (safe to re-run)

INSERT INTO profiles (id, role, name) VALUES
  ('a1000006-0000-4000-8000-000000000006', 'member', 'Sulay'),
  ('a1000007-0000-4000-8000-000000000007', 'member', 'Ethan'),
  ('a1000008-0000-4000-8000-000000000008', 'member', 'Jacob'),
  ('a1000009-0000-4000-8000-000000000009', 'member', 'Dolev'),
  ('a1000010-0000-4000-8000-000000000010', 'member', 'Shalom')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';

ALTER TABLE whiteboard_items
  ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';
