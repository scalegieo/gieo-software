-- GIEO v2 migration — run after schema.sql in Supabase SQL editor

-- Team chat: system messages + richer client records
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'user';

ALTER TABLE clients ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE financials ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT;
ALTER TABLE financials ADD COLUMN IF NOT EXISTS hosted_invoice_url TEXT;
ALTER TABLE financials ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Realtime (safe if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
