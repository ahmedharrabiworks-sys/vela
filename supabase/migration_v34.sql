-- Round M: intent_summary on leads (Fix 8), deleted_at on websites (Fix 10)

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS intent_summary TEXT;

ALTER TABLE websites
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
