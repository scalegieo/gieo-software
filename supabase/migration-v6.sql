-- GIEO migration v6: two business portals (GIEO + Python) in one client hub
-- Run in Supabase SQL Editor after migration-v5.sql

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS business TEXT NOT NULL DEFAULT 'gieo';
