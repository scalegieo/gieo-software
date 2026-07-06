-- GIEO migration v5: shared client profiles (hours, retainer, contacts)
-- Run in Supabase SQL Editor after migration-v4.sql

CREATE TABLE IF NOT EXISTS client_profiles (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all client_profiles" ON client_profiles FOR ALL TO anon USING (true);
CREATE POLICY "authenticated all client_profiles" ON client_profiles FOR ALL TO authenticated USING (true);
