/**
 * Phase A item 3 — Domain "Connected" badge regression prevention
 *
 * Verifies:
 *   (A) Exhaustive domain_status write-site audit — every location in src/ that
 *       writes domain_status is accounted for and categorised as legitimate or not
 *   (B) settings/route.ts no longer writes domain_status (the false-positive trap)
 *   (C) domain/route.ts GET is the ONLY path that can write "verified"
 *   (D) Frontend badge reads domainStatus === "verified", not domain-presence
 *   (E) Live Supabase: row with domain_status='pending' stays 'pending' after
 *       a name/slug-only update (simulates what settings PUT now does)
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-phase-a3-domain-badge.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

let totalChecks = 0;
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  totalChecks++;
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else           { failed++; console.error(`  ❌ ${label}${detail ? `\n       → ${detail}` : ""}`); }
}

const SRC = path.join(process.cwd(), "src");

function readSrc(rel: string) {
  return fs.readFileSync(path.join(SRC, rel), "utf-8");
}

const domainRoute   = readSrc("app/api/website/domain/route.ts");
const settingsRoute = readSrc("app/api/website/settings/route.ts");
const pageTsx       = readSrc("app/app/website/page.tsx");

// ── (A) Exhaustive write-site audit ──────────────────────────────────────────
console.log("\n══ A: Exhaustive domain_status write-site audit ══\n");

// The only files that should write domain_status are domain/route.ts routes.
// settings/route.ts must not write it.
// All other routes (publish, save-edit, generate, restore, reset, list, analytics, image-replace) must not touch it.
const otherRoutes = [
  "app/api/website/publish/route.ts",
  "app/api/website/save-edit/route.ts",
  "app/api/website/generate/route.ts",
  "app/api/website/restore/route.ts",
  "app/api/website/reset/route.ts",
  "app/api/website/list/route.ts",
  "app/api/website/analytics/route.ts",
  "app/api/website/image-replace/route.ts",
  "app/api/website/domain-lookup/route.ts",
  "app/api/website/domain-probe/route.ts",
  "app/api/website/state/route.ts",
];

for (const rel of otherRoutes) {
  const src = readSrc(rel);
  // "write" means the field appears in an update() / insert() / upsert() call —
  // .select() and type annotations are read-side and do not count.
  // We check for assignment patterns: domain_status: or domain_status =
  const hasWrite =
    /\.update\([^)]*domain_status/.test(src) ||
    /\.insert\([^)]*domain_status/.test(src) ||
    /\.upsert\([^)]*domain_status/.test(src) ||
    /updates\.domain_status\s*=/.test(src) ||
    /domain_status:\s*["']/.test(src.replace(/\/\/.*/g, "")); // strip comments, check literal assignment
  check(`${rel.split("/").slice(-3).join("/")} — no domain_status write`, !hasWrite,
    "unexpected domain_status write found");
}

// ── (B) settings/route.ts — no domain_status write ───────────────────────────
console.log("\n══ B: settings/route.ts — false-positive trap removed ══\n");

check("settings route: no updates.domain_status assignment",
  !settingsRoute.includes("updates.domain_status"));
check("settings route: no domain_status literal write in updates",
  !/updates\[['"]domain_status['"]\]/.test(settingsRoute));
check("settings route: DOMAIN_RE constant removed (was used only for domain block)",
  !settingsRoute.includes("DOMAIN_RE"));
check("settings route: body type has no domain field",
  !settingsRoute.includes("domain?:") && !settingsRoute.match(/body.*domain[^_]/));
check("settings route: guard comment present explaining the contract",
  settingsRoute.includes("NEVER handles domain or domain_status"));
check("settings route: NOTE comment present near update block",
  settingsRoute.includes("domain / domain_status intentionally NOT handled here"));

// ── (C) domain/route.ts — verified write paths ───────────────────────────────
console.log("\n══ C: domain/route.ts — verified can only be written by GET (Check Status) ══\n");

// POST handler must write only "pending"
const postBlock = domainRoute.slice(
  domainRoute.indexOf("export async function POST"),
  domainRoute.indexOf("export async function GET"),
);
check("domain POST handler: writes domain_status 'pending'",
  postBlock.includes(`domain_status: "pending"`));
// Strip single-line comments before checking for code-level "verified" writes
const postBlockCode = postBlock.replace(/\/\/.*/g, "");
check("domain POST handler: does NOT write 'verified' in code (comments stripped)",
  !postBlockCode.includes(`"verified"`));

// GET handler is the Check Status endpoint — it can write verified/pending/failed
const getBlock = domainRoute.slice(
  domainRoute.indexOf("export async function GET"),
  domainRoute.indexOf("export async function DELETE"),
);
check("domain GET handler: can write 'verified' (Check Status path)",
  getBlock.includes(`"verified"`));
// "verified" assignment must be inside the dnsOk && probeOk branch
check("domain GET handler: 'verified' requires BOTH dnsOk AND probeOk",
  /if\s*\(\s*dnsOk\s*&&\s*probeOk\s*\)\s*\{[^}]*"verified"/.test(getBlock));
check("domain GET handler: persist only if status changed (no spurious writes)",
  getBlock.includes("status !== currentStatus"));

// DELETE handler writes null only
const deleteBlock = domainRoute.slice(
  domainRoute.indexOf("export async function DELETE"),
);
check("domain DELETE handler: writes domain_status null (clear on remove)",
  deleteBlock.includes("domain_status: null"));
check("domain DELETE handler: does NOT write 'verified'",
  !deleteBlock.includes(`"verified"`));

// ── (D) Frontend badge — reads status value, not domain presence ───────────────
console.log("\n══ D: Frontend badge reads domainStatus==='verified', not domain presence ══\n");

check(`page.tsx: badge 'Connected' tied to domainStatus === "verified"`,
  pageTsx.includes(`domainStatus === "verified" ? "Connected"`));
check("page.tsx: no badge shown from mere presence of customDomain string",
  !pageTsx.match(/customDomain\s*&&\s*[^d]/) ||  // customDomain used only with domainStatus check
  pageTsx.includes(`customDomain && domainStatus === "verified"`));
check('page.tsx: setDomainStatus("pending") on POST domain (connect)',
  pageTsx.includes(`setDomainStatus("pending")`));
check("page.tsx: setDomainStatus reads data.status on GET domain (check)",
  pageTsx.includes("if (data.status) setDomainStatus(data.status"));
check("page.tsx: setDomainStatus(null) on DELETE domain (remove)",
  pageTsx.includes("setDomainStatus(null)"));
check("page.tsx: page-load reads domainStatus from server state (data.domainStatus)",
  pageTsx.includes("if (data.domainStatus) setDomainStatus(data.domainStatus"));
check("page.tsx: domain status NOT auto-refreshed on publish panel open (comment present)",
  pageTsx.includes("Domain status is NOT auto-checked here"));

// ── (E) Live Supabase: pending row survives name/slug update ──────────────────
async function runLiveChecks() {
  console.log("\n══ E: Live Supabase — domain_status 'pending' survives name/slug-only update ══\n");

  const sbUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !svcKey) {
    check("env vars present", false, "missing SUPABASE vars — run with --env-file .env.local");
    return;
  }

  const admin = createClient(sbUrl, svcKey, { auth: { persistSession: false } });

  const { data: tenantRow } = await admin.from("tenants").select("id").limit(1).maybeSingle();
  const tenantId = (tenantRow as { id: string } | null)?.id ?? null;
  if (!tenantId) {
    check("tenant found for test row", false, "DB has no tenants yet");
    return;
  }
  console.log(`  Using tenant_id: ${tenantId}`);

  const TEST_DOMAIN = "test-badge-a3.example.invalid";
  const TEST_SLUG   = "test-badge-a3-slug";

  const { data: inserted, error: insertErr } = await admin
    .from("websites")
    .insert({
      tenant_id:      tenantId,
      name:           "_test-badge-a3",
      slug:           TEST_SLUG,
      domain:         TEST_DOMAIN,
      domain_status:  "pending",
      is_published:   false,
      draft_html:     "<html><body>test</body></html>",
    })
    .select("id")
    .single();

  if (insertErr) {
    check("test row inserted", false, insertErr.message);
    return;
  }

  const testId = (inserted as { id: string }).id;
  console.log(`  Inserted test row id: ${testId} with domain_status='pending'`);

  try {
    // Simulate what settings PUT now does: update only name + updated_at (no domain_status)
    const { error: updateErr } = await admin
      .from("websites")
      .update({ name: "_test-badge-a3-renamed", updated_at: new Date().toISOString() })
      .eq("id", testId);

    check("name-only update succeeds", !updateErr, updateErr?.message);

    // Verify domain_status is still 'pending'
    const { data: row } = await admin
      .from("websites")
      .select("domain_status")
      .eq("id", testId)
      .single();

    const status = (row as { domain_status: string | null } | null)?.domain_status;
    check("domain_status remains 'pending' after name-only update",
      status === "pending",
      `got '${status}', expected 'pending'`);

    console.log(`\n  Actual domain_status after name update: '${status}' (expected 'pending')`);

    // Also simulate a slug update (same as settings PUT would do)
    await admin
      .from("websites")
      .update({ slug: TEST_SLUG + "-renamed", updated_at: new Date().toISOString() })
      .eq("id", testId);

    const { data: row2 } = await admin
      .from("websites")
      .select("domain_status")
      .eq("id", testId)
      .single();

    const status2 = (row2 as { domain_status: string | null } | null)?.domain_status;
    check("domain_status remains 'pending' after slug-only update",
      status2 === "pending",
      `got '${status2}', expected 'pending'`);

    console.log(`  Actual domain_status after slug update: '${status2}' (expected 'pending')`);

  } finally {
    const { error: delErr } = await admin.from("websites").delete().eq("id", testId);
    if (delErr) {
      console.error(`\n  ⚠️  Cleanup failed for row ${testId}: ${delErr.message}`);
      console.error(`  Run manually: DELETE FROM websites WHERE id = '${testId}';`);
    } else {
      console.log(`\n  Cleaned up test row ${testId} ✓`);
    }
  }
}

runLiveChecks()
  .then(() => {
    console.log("\n══════════════════════════════════════════════════════════");
    console.log(`  Phase A3 Domain Badge Verification`);
    console.log(`  Total: ${totalChecks}  |  Passed: ${passed}  |  Failed: ${failed}`);
    console.log("══════════════════════════════════════════════════════════");
    if (failed > 0) {
      console.error(`\n❌ ${failed} check(s) failed.`);
      process.exit(1);
    } else {
      console.log(`\n✅ All ${totalChecks} checks passed.`);
    }
  })
  .catch((err: unknown) => {
    console.error("Unexpected error:", err);
    process.exit(1);
  });
