-- Round P FIX 6: a customer-provided phone number with no real country
-- code (e.g. "280423") was saved as equal-status, fully-trusted contact
-- info -- no way to tell it apart from a real, dialable number anywhere in
-- the dashboard. phone_unconfirmed is set true whenever
-- hasConfirmedCountryCode(phone) fails (see src/lib/phone-validate.ts) at
-- the moment ensureLeadFromContact saves/updates a lead's phone. Nullable
-- default false: existing leads are not retroactively flagged (no way to
-- re-validate a number that might have been entered by the owner directly,
-- with full context, rather than captured raw from a customer message).
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS phone_unconfirmed BOOLEAN NOT NULL DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
