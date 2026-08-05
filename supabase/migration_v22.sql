-- migration_v22.sql: add theme_preset to tenant_config for per-tenant color theme persistence
ALTER TABLE tenant_config
  ADD COLUMN IF NOT EXISTS theme_preset TEXT NOT NULL DEFAULT 'orange';

NOTIFY pgrst, 'reload schema';
