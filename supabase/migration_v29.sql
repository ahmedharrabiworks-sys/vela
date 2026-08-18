-- Round E FIX 9: real "Rescheduled" indicator on appointments, instead of
-- inferring it (or worse, having a duplicate row stand in for it).
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS rescheduled BOOLEAN NOT NULL DEFAULT FALSE;

-- Round E FIX 6: real, tenant-scoped "Powered by Vela" branding toggle.
-- Was localStorage-only on the owner's own browser, which the public
-- widget (served to anonymous visitors on a different device) could never
-- read. Read at serve time by the widget page, same pattern as
-- websites.embed_ai_assistant.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS hide_powered_by BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
