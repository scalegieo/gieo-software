-- GIEO migration v9: Lead Intelligence (scraper, AI analysis, call scripts)
-- Run in Supabase SQL Editor (safe to re-run)

CREATE TABLE IF NOT EXISTS scraper_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL DEFAULT 'gieo',
  source TEXT NOT NULL,
  query TEXT NOT NULL,
  location TEXT,
  max_results INT NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'running',
  progress INT NOT NULL DEFAULT 0,
  total_found INT NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS intel_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business TEXT NOT NULL DEFAULT 'gieo',
  business_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  country TEXT,
  industry TEXT,
  category TEXT,
  employee_count TEXT,
  description TEXT,
  hours TEXT,
  google_rating FLOAT,
  review_count INT,
  social_media JSONB NOT NULL DEFAULT '{}',
  tech_stack JSONB NOT NULL DEFAULT '[]',
  website_quality INT,
  has_website BOOLEAN NOT NULL DEFAULT FALSE,
  verification JSONB NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  ai_services_needed JSONB NOT NULL DEFAULT '[]',
  ai_lead_score INT,
  ai_score_reasoning TEXT,
  ai_verified BOOLEAN,
  ai_insights JSONB NOT NULL DEFAULT '{}',
  ai_analyzed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'new',
  source TEXT NOT NULL DEFAULT 'manual',
  tags JSONB NOT NULL DEFAULT '[]',
  notes TEXT NOT NULL DEFAULT '',
  scraper_job_id UUID REFERENCES scraper_jobs(id) ON DELETE SET NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS intel_leads_business_idx ON intel_leads (business, created_at DESC);

CREATE TABLE IF NOT EXISTS call_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES intel_leads(id) ON DELETE CASCADE,
  business TEXT NOT NULL DEFAULT 'gieo',
  title TEXT NOT NULL,
  script_type TEXT NOT NULL,
  tone TEXT NOT NULL,
  script TEXT NOT NULL,
  talking_points JSONB NOT NULL DEFAULT '[]',
  objection_handlers JSONB NOT NULL DEFAULT '[]',
  voicemail_script TEXT,
  follow_up_email TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scraper_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE intel_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon all scraper_jobs" ON scraper_jobs;
CREATE POLICY "anon all scraper_jobs" ON scraper_jobs FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon all intel_leads" ON intel_leads;
CREATE POLICY "anon all intel_leads" ON intel_leads FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon all call_scripts" ON call_scripts;
CREATE POLICY "anon all call_scripts" ON call_scripts FOR ALL TO anon USING (true) WITH CHECK (true);

DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE intel_leads; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

NOTIFY pgrst, 'reload schema';
