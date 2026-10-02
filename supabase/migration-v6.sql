-- GIEO migration v6: two business workspaces (GIEO + Python) in one app
-- Run in Supabase SQL Editor after migration-v5.sql (safe to re-run)

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';
