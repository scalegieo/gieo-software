-- GIEO v3 — AI usage tracking for team
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  request_count INT NOT NULL DEFAULT 0,
  token_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ai_usage_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon all ai_usage_daily" ON ai_usage_daily;
CREATE POLICY "anon all ai_usage_daily" ON ai_usage_daily FOR ALL TO anon USING (true);
DROP POLICY IF EXISTS "authenticated all ai_usage_daily" ON ai_usage_daily;
CREATE POLICY "authenticated all ai_usage_daily" ON ai_usage_daily FOR ALL TO authenticated USING (true);
