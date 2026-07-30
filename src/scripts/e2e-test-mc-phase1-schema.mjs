// Mission Control Phase 1 — schema instrumentation verification
// Static source checks (no auth required). Run: node src/scripts/e2e-test-mc-phase1-schema.mjs
//
// What this covers:
//   A: save-call/route.ts sets knowledge_base_updated_at on KB save
//   B: ai-training/route.ts sets knowledge_base_updated_at on KB save
//   C: other tenant_config writers do NOT set knowledge_base_updated_at
//   D: migration_v13.sql is correct and complete
//
// After Oussama runs migration_v13.sql in Supabase SQL Editor, run this SQL
// to confirm the column exists and verify index usage:
//
//   -- Column check:
//   SELECT column_name, data_type, column_default, is_nullable
//   FROM information_schema.columns
//   WHERE table_name = 'tenant_config'
//     AND column_name = 'knowledge_base_updated_at';
//
//   -- Index check:
//   SELECT indexname, indexdef
//   FROM pg_indexes
//   WHERE tablename = 'agent_calls'
//   ORDER BY indexname;
//
//   -- EXPLAIN for Phase 1 aggregation query (should use idx_agent_calls_tenant_period):
//   EXPLAIN SELECT tenant_id, SUM(duration_seconds)
//   FROM agent_calls
//   WHERE created_at >= NOW() - INTERVAL '30 days'
//   GROUP BY tenant_id;

import { readFileSync } from "fs";
import { join } from "path";

const ROOT = "C:/Users/ahmed/OneDrive/Desktop/vela/src";
const SUPABASE = "C:/Users/ahmed/OneDrive/Desktop/vela/supabase";
let passed = 0, failed = 0;

function check(label, ok) {
  if (ok) { passed++; console.log("  PASS:", label); }
  else     { failed++; console.error("  FAIL:", label); }
}

const saveCallSrc   = readFileSync(join(ROOT, "app/api/ai-agent/save-call/route.ts"), "utf8");
const aiTrainingSrc = readFileSync(join(ROOT, "app/api/ai-training/route.ts"), "utf8");
const settingsSrc   = readFileSync(join(ROOT, "app/app/settings/page.tsx"), "utf8");
const phoneRouteSrc = readFileSync(join(ROOT, "app/api/ai-agent/phone/route.ts"), "utf8");
const migrationSrc  = readFileSync(join(SUPABASE, "migration_v13.sql"), "utf8");

// ── A: save-call instruments KB writes ───────────────────────────────────────
console.log("\nA: save-call/route.ts — knowledge_base_updated_at on KB save");
check("A1 knowledge_base_updated_at set in update payload",
  saveCallSrc.includes("knowledge_base_updated_at:"));
check("A2 uses new Date().toISOString()",
  saveCallSrc.includes("new Date().toISOString()"));
check("A3 same update call as knowledge_base (not a separate query)",
  (() => {
    const updateIdx = saveCallSrc.indexOf("knowledge_base_updated_at:");
    const kbIdx     = saveCallSrc.lastIndexOf("knowledge_base:", updateIdx);
    // Both fields should be within 300 chars of each other (same object)
    return updateIdx > 0 && kbIdx > 0 && (updateIdx - kbIdx) < 300;
  })());
check("A4 no separate .update( call for timestamp alone",
  (saveCallSrc.match(/\.update\s*\(/g) ?? []).length === 1);

// ── B: ai-training instruments KB writes ─────────────────────────────────────
console.log("\nB: ai-training/route.ts — knowledge_base_updated_at on KB save");
check("B1 knowledge_base_updated_at set in upsert payload",
  aiTrainingSrc.includes("knowledge_base_updated_at:"));
check("B2 uses new Date().toISOString()",
  aiTrainingSrc.includes("new Date().toISOString()"));
check("B3 same upsert call as knowledge_base (not a separate query)",
  (() => {
    const upsertIdx = aiTrainingSrc.indexOf("knowledge_base_updated_at:");
    const kbIdx     = aiTrainingSrc.lastIndexOf("knowledge_base:", upsertIdx);
    return upsertIdx > 0 && kbIdx > 0 && (upsertIdx - kbIdx) < 300;
  })());
check("B4 no separate .update( call for timestamp alone",
  !aiTrainingSrc.includes(".update("));

// ── C: non-KB tenant_config writers do NOT set knowledge_base_updated_at ─────
console.log("\nC: non-KB writers do NOT set knowledge_base_updated_at");
check("C1 settings/page.tsx (tone/language) does not set timestamp",
  !settingsSrc.includes("knowledge_base_updated_at"));
check("C2 ai-agent/phone/route.ts (vapi phone) does not set timestamp",
  !phoneRouteSrc.includes("knowledge_base_updated_at"));
check("C3 save-call .update() payload has only knowledge_base + timestamp (no stray DB fields)",
  (() => {
    // Locate the .update({ ... }) call that writes to tenant_config
    const updateBlock = saveCallSrc.match(/\.update\s*\(\s*\{([^}]+)\}/s)?.[1] ?? "";
    // Must contain both KB fields
    const hasKb  = updateBlock.includes("knowledge_base:");
    const hasTs  = updateBlock.includes("knowledge_base_updated_at:");
    // Must NOT contain unrelated tenant_config fields in the same object
    const hasRogue = updateBlock.includes("tone:") || updateBlock.includes("language:") ||
                     updateBlock.includes("website_html") || updateBlock.includes("assistant_settings");
    return hasKb && hasTs && !hasRogue;
  })());

// ── D: migration_v13.sql correct and complete ─────────────────────────────────
console.log("\nD: migration_v13.sql content");
check("D1 ALTER TABLE adds knowledge_base_updated_at",
  migrationSrc.includes("ADD COLUMN IF NOT EXISTS knowledge_base_updated_at TIMESTAMPTZ"));
check("D2 default is NULL not now()",
  migrationSrc.includes("DEFAULT NULL"));
check("D3 composite index name is idx_agent_calls_tenant_period",
  migrationSrc.includes("idx_agent_calls_tenant_period"));
check("D4 composite index covers tenant_id + created_at",
  migrationSrc.includes("ON agent_calls(tenant_id, created_at)"));
check("D5 index SQL uses created_at not started_at as the time column",
  (() => {
    // The CREATE INDEX may span two lines (name on first, ON clause on second).
    // Extract from CREATE INDEX ... through the closing semicolon.
    const indexBlock = migrationSrc.match(/CREATE INDEX[\s\S]*?idx_agent_calls_tenant_period[\s\S]*?;/)?.[0] ?? "";
    return indexBlock.includes("created_at") && !indexBlock.includes("started_at");
  })());
check("D6 NOTIFY pgrst reload schema present",
  migrationSrc.includes("NOTIFY pgrst, 'reload schema'"));
check("D7 header comment explains why composite index (not just single-col)",
  migrationSrc.includes("single-column"));
check("D8 header comment notes column name correction from §13",
  migrationSrc.includes("started_at"));

console.log(`\n${"=".repeat(44)}`);
console.log(`MC Phase 1 schema: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
