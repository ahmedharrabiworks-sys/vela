-- ============================================================
-- VELA — Migration v39: Instagram Business Login token expiry
-- ============================================================
-- Supports the rebuilt Instagram OAuth flow (Instagram API with Instagram
-- Login, replacing the deprecated Facebook Login + linked Page method Meta
-- now rejects with "Invalid Scopes"). The new flow's access token is a
-- long-lived Instagram User access token that genuinely expires (~60 days),
-- unlike the old Page Access Token this replaces, which did not. This
-- column tracks the real expiry returned by Meta's long-lived token
-- exchange so a future refresh job has something real to check against.
--
-- Deliberately does NOT add a separate instagram_user_id column:
-- instagram_business_id already holds exactly that value (the Instagram-
-- scoped professional account id) and is already the column the Instagram
-- webhook handler keys its tenant lookup on -- a second column would only
-- duplicate it. instagram_access_token and instagram_username are also
-- reused as-is (same semantic role, new token type).
--
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS).

ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
