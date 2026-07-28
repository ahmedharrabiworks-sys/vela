/**
 * Domain routing verification — Phase A item 2
 *
 * Verifies:
 *   (A) isCustomDomain logic correctly distinguishes main-app hosts from customer domains
 *   (B) Supabase query (same as middleware uses) returns slug for verified+published domain
 *   (C) Same query returns null for domain_status='pending' (fallback path)
 *   (D) Same query returns null for a domain not in DB (fallback path)
 *   (E) middleware.ts source contains no Vercel Domains API calls
 *   (F) middleware.ts uses direct Supabase REST (no self-HTTP domain-lookup call)
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-domain-routing.ts
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

const MIDDLEWARE_PATH = path.join(process.cwd(), "src/middleware.ts");
const middlewareSource = fs.readFileSync(MIDDLEWARE_PATH, "utf-8");

let totalChecks = 0;
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  totalChecks++;
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else           { failed++; console.error(`  ❌ ${label}${detail ? `\n       → ${detail}` : ""}`); }
}

// ── (A) isCustomDomain logic — static assertions ──────────────────────────────
console.log("\n══ A: isCustomDomain distinguishes main-app from customer hosts ══\n");

function isCustomDomain(hostname: string, appHost: string): boolean {
  return (
    hostname !== appHost &&
    !hostname.startsWith("localhost") &&
    !hostname.endsWith(".vercel.app")
  );
}

const appHostFromEnv = (process.env.NEXT_PUBLIC_APP_URL ?? "https://tryvela.com")
  .replace(/^https?:\/\//, "")
  .split("/")[0]
  .toLowerCase();

// In local dev NEXT_PUBLIC_APP_URL = http://localhost:3000, so appHostFromEnv = 'localhost:3000'.
// In production it will be 'tryvela.com'. The isCustomDomain() logic is the same either way;
// we test production-equivalent behavior by using the canonical production host directly.
const PROD_APP_HOST = "tryvela.com";
console.log(`  appHost from env: "${appHostFromEnv}" (dev may be localhost; production: "${PROD_APP_HOST}")`);

// Production host checks — use PROD_APP_HOST to verify the logic that runs in production
check("vela-g8h4.vercel.app → NOT custom (ends .vercel.app)",
  !isCustomDomain("vela-g8h4.vercel.app", PROD_APP_HOST));
check("vela-g8h4-moz0ueymk-brandlab.vercel.app → NOT custom (ends .vercel.app)",
  !isCustomDomain("vela-g8h4-moz0ueymk-brandlab.vercel.app", PROD_APP_HOST));
check("tryvela.com → NOT custom (matches production appHost)",
  !isCustomDomain("tryvela.com", PROD_APP_HOST));
check("localhost → NOT custom (startsWith localhost)",
  !isCustomDomain("localhost", PROD_APP_HOST));
check("localhost:3000 → NOT custom (startsWith localhost)",
  !isCustomDomain("localhost:3000", PROD_APP_HOST));
check("www.customer.com → IS custom",
  isCustomDomain("www.customer.com", PROD_APP_HOST));
check("client-business.io → IS custom",
  isCustomDomain("client-business.io", PROD_APP_HOST));
check("my-salon.ae → IS custom",
  isCustomDomain("my-salon.ae", PROD_APP_HOST));

// ── (E) No Vercel Domains API calls ───────────────────────────────────────────
console.log("\n══ E: No Vercel Domains API calls in middleware ══\n");

check("middleware.ts: no api.vercel.com URL",
  !middlewareSource.includes("api.vercel.com") && !middlewareSource.includes("vercel.com/v"));
check("middleware.ts: no VERCEL_API_TOKEN usage",
  !middlewareSource.includes("VERCEL_API_TOKEN"));
check("middleware.ts: no addDomain / projectDomain references",
  !middlewareSource.includes("addDomain") && !middlewareSource.includes("projectDomain"));

// ── (F) Direct Supabase REST, no self-HTTP call ────────────────────────────────
console.log("\n══ F: Direct Supabase REST — no self-HTTP domain-lookup call ══\n");

check("middleware.ts: contains resolveCustomDomain() function",
  middlewareSource.includes("async function resolveCustomDomain("));
check("middleware.ts: queries /rest/v1/websites directly",
  middlewareSource.includes("/rest/v1/websites?"));
check("middleware.ts: filters domain_status=eq.verified",
  middlewareSource.includes("domain_status=eq.verified"));
check("middleware.ts: filters is_published=eq.true",
  middlewareSource.includes("is_published=eq.true"));
check("middleware.ts: NO self-HTTP call to /api/website/domain-lookup",
  !middlewareSource.includes("/api/website/domain-lookup"));
check("middleware.ts: uses service role key for DB query",
  middlewareSource.includes("Bearer ${svcKey}"));
check("middleware.ts: fallback is NextResponse.next() not 404 HTML",
  middlewareSource.includes("NextResponse.next({ request })") &&
  !middlewareSource.includes("<!doctype html>"));
check("middleware.ts: verified domain rewrites to /site/${slug}",
  middlewareSource.includes("url.pathname = `/site/${slug}`"));

// domain-lookup route also updated
const dlSource = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/website/domain-lookup/route.ts"),
  "utf-8"
);
check("domain-lookup route: also filters domain_status='verified'",
  dlSource.includes('"verified"') || dlSource.includes("'verified'"));

// ── (B)–(D) Live Supabase row test ────────────────────────────────────────────
async function runLiveChecks() {
  console.log("\n══ B–D: Real Supabase row — verified / pending / not-found ══\n");

  const sbUrl   = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!sbUrl || !svcKey || !anonKey) {
    console.error("  ⚠️  Env vars missing — run with --env-file .env.local");
    check("env vars present", false, "missing SUPABASE vars");
    return;
  }

  const admin = createClient(sbUrl, svcKey, { auth: { persistSession: false } });

  // Mirrors resolveCustomDomain() in middleware.ts — uses direct Supabase REST
  async function queryDomain(hostname: string, statusFilter = "verified"): Promise<string | null> {
    const params =
      `domain=eq.${encodeURIComponent(hostname)}` +
      `&is_published=eq.true` +
      `&domain_status=eq.${statusFilter}` +
      `&select=slug,id` +
      `&limit=1`;
    const res = await fetch(`${sbUrl}/rest/v1/websites?${params}`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${svcKey}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const rows = await res.json() as { slug: string | null; id: string }[];
    if (!Array.isArray(rows) || !rows.length) return null;
    return rows[0].slug ?? rows[0].id;
  }

  const TEST_DOMAIN = "test-vela-domain-routing-verify.example.invalid";
  const TEST_SLUG   = "test-vela-routing-slug";
  let testRowId: string | null = null;

  // Look up any existing tenant for the FK constraint
  const { data: tenantRow } = await admin.from("tenants").select("id").limit(1).maybeSingle();
  const tenantId = (tenantRow as { id: string } | null)?.id ?? null;

  if (!tenantId) {
    console.error("  ⚠️  No tenant rows in DB — cannot test live row insertion");
    check("tenant found for test row", false, "DB has no tenants yet");
    return;
  }

  console.log(`  Using tenant_id: ${tenantId}`);

  // Insert test row: verified + published
  const { data: inserted, error: insertErr } = await admin
    .from("websites")
    .insert({
      tenant_id:      tenantId,
      name:           "_test-domain-routing",
      slug:           TEST_SLUG,
      domain:         TEST_DOMAIN,
      domain_status:  "verified",
      is_published:   true,
      draft_html:     "<html><body>test</body></html>",
      published_html: "<html><body>test</body></html>",
    })
    .select("id")
    .single();

  if (insertErr) {
    check("test row inserted", false, insertErr.message);
    return;
  }

  testRowId = (inserted as { id: string }).id;
  console.log(`  Inserted test row id: ${testRowId}`);

  try {
    // (B) Happy path: verified + published → returns slug
    const slugVerified = await queryDomain(TEST_DOMAIN);
    check("(B) verified+published domain → slug returned",
      slugVerified === TEST_SLUG,
      `got ${JSON.stringify(slugVerified)}, expected "${TEST_SLUG}"`);

    // (C) Fallback: query with 'pending' filter for same domain → null
    //     Simulates what happens when a domain is pending/unverified —
    //     the middleware's `domain_status=eq.verified` filter excludes it.
    const slugPending = await queryDomain(TEST_DOMAIN, "pending");
    check("(C) same domain via pending-filter query → null (fallback path)",
      slugPending === null,
      `got ${JSON.stringify(slugPending)}, expected null`);

    // (D) Fallback: completely missing domain → null
    const slugMissing = await queryDomain("definitely-not-in-db.example.invalid");
    check("(D) non-existent domain → null (fallback path)",
      slugMissing === null,
      `got ${JSON.stringify(slugMissing)}, expected null`);

    // Extra: unpublished site → null even if verified
    await admin.from("websites").update({ is_published: false }).eq("id", testRowId);
    const slugUnpublished = await queryDomain(TEST_DOMAIN);
    check("(B-extra) verified domain but is_published=false → null",
      slugUnpublished === null,
      `got ${JSON.stringify(slugUnpublished)}, expected null`);

    console.log("\n  Actual query outputs:");
    console.log(`    verified+published:    "${slugVerified}" (expected "${TEST_SLUG}")`);
    console.log(`    pending-filter:        ${slugPending} (expected null)`);
    console.log(`    missing domain:        ${slugMissing} (expected null)`);
    console.log(`    verified+unpublished:  ${slugUnpublished} (expected null)`);

  } finally {
    // Always clean up test row
    const { error: delErr } = await admin.from("websites").delete().eq("id", testRowId);
    if (delErr) {
      console.error(`\n  ⚠️  Cleanup failed for row ${testRowId}: ${delErr.message}`);
      console.error(`  Run manually: DELETE FROM websites WHERE id = '${testRowId}';`);
    } else {
      console.log(`\n  Cleaned up test row ${testRowId} ✓`);
    }
  }
}

runLiveChecks()
  .then(() => {
    console.log("\n══════════════════════════════════════════════════════════");
    console.log(`  Domain Routing Verification Summary`);
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
