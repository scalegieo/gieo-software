-- GIEO Supabase Schema
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL DEFAULT 'member',
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'new',
  value INT NOT NULL DEFAULT 0,
  business TEXT NOT NULL DEFAULT 'gieo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  mrr INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  name TEXT,
  company TEXT,
  stripe_customer_id TEXT,
  business TEXT NOT NULL DEFAULT 'gieo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_path TEXT NOT NULL DEFAULT '',
  amount INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_invoice_id TEXT,
  hosted_invoice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  ad_url TEXT NOT NULL DEFAULT '',
  spend INT NOT NULL DEFAULT 0,
  roas FLOAT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'todo',
  priority TEXT NOT NULL DEFAULT 'medium',
  business TEXT NOT NULL DEFAULT 'gieo'
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

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

-- Row Level Security (basic policies)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users full access leads" ON leads FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access clients" ON clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access financials" ON financials FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access campaigns" ON campaigns FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access tasks" ON tasks FOR ALL TO authenticated USING (true);
CREATE POLICY "Authenticated users full access messages" ON messages FOR ALL TO authenticated USING (true);

-- Anon access for GIEO local username auth (personal testing)
CREATE POLICY "anon read profiles" ON profiles FOR SELECT TO anon USING (true);
CREATE POLICY "anon all leads" ON leads FOR ALL TO anon USING (true);
CREATE POLICY "anon all clients" ON clients FOR ALL TO anon USING (true);
CREATE POLICY "anon all financials" ON financials FOR ALL TO anon USING (true);
CREATE POLICY "anon all campaigns" ON campaigns FOR ALL TO anon USING (true);
CREATE POLICY "anon all tasks" ON tasks FOR ALL TO anon USING (true);
CREATE POLICY "anon all messages" ON messages FOR ALL TO anon USING (true);

-- Team-wide Ollama Cloud usage (shared API key)
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  request_count INT NOT NULL DEFAULT 0,
  token_count INT NOT NULL DEFAULT 0,
  agentic_token_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all ai_usage_daily" ON ai_usage_daily FOR ALL TO anon USING (true);
CREATE POLICY "authenticated all ai_usage_daily" ON ai_usage_daily FOR ALL TO authenticated USING (true);

INSERT INTO profiles (id, role, name) VALUES
  ('a1000001-0000-4000-8000-000000000001', 'admin', 'Reda'),
  ('a1000002-0000-4000-8000-000000000002', 'media_buyer', 'Yoni'),
  ('a1000003-0000-4000-8000-000000000003', 'sales', 'Yeab'),
  ('a1000004-0000-4000-8000-000000000004', 'ops', 'Natu'),
  ('a1000005-0000-4000-8000-000000000005', 'creative', 'Lydia')
ON CONFLICT (id) DO NOTHING;

-- Shared client profiles (hours, retainer, contacts) — synced across team
CREATE TABLE IF NOT EXISTS client_profiles (
  client_id UUID PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all client_profiles" ON client_profiles FOR ALL TO anon USING (true);
CREATE POLICY "authenticated all client_profiles" ON client_profiles FOR ALL TO authenticated USING (true);
