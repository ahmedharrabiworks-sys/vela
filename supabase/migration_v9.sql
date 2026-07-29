-- ============================================================
-- VELA — Migration v9: WhatsApp Meta Cloud API
-- Run AFTER schema.sql + migration_v2 through v8
-- Safe to run multiple times (IF NOT EXISTS guards throughout)
-- ============================================================

-- Per-tenant WhatsApp Business Account credentials.
-- Separate table (not flat columns on tenant_config) because:
--   • phone_number_id UNIQUE index is required for O(1) webhook routing
--   • tenant_config is 1:1; this table is 1:many for future multi-number support
--   • Easier to audit and eventually encrypt without touching the main config blob
CREATE TABLE IF NOT EXISTS whatsapp_accounts (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  waba_id           TEXT        NOT NULL,
  phone_number_id   TEXT        NOT NULL,
  phone_number      TEXT        DEFAULT NULL,   -- display e.g. "+971 50 123 4567"
  display_name      TEXT        DEFAULT NULL,   -- Meta verified_name for the number
  access_token      TEXT        NOT NULL,       -- Business Integration System User token (long-lived)
  token_acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Primary webhook routing index: given phone_number_id from Meta payload → find tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_accounts_phone_number_id
  ON whatsapp_accounts(phone_number_id);

-- Partial index for the active-only path used in webhook routing
CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_active_phone
  ON whatsapp_accounts(phone_number_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_whatsapp_accounts_tenant
  ON whatsapp_accounts(tenant_id);

ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'whatsapp_accounts' AND policyname = 'whatsapp_accounts_owner'
  ) THEN
    CREATE POLICY "whatsapp_accounts_owner" ON whatsapp_accounts
      FOR ALL USING (
        tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
      );
  END IF;
END $$;

-- Add WABA ID reference to tenant_config for quick lookup without joining.
-- whatsapp_connected and whatsapp_phone already exist from migration_v4.
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS whatsapp_waba_id TEXT DEFAULT NULL;

NOTIFY pgrst, 'reload schema';
