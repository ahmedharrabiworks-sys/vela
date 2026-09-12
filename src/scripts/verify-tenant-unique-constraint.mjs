// STEP 4 verification — run this ONLY after migration_v38.sql has been
// applied in the Supabase SQL Editor. Confirms (a) the unique constraint
// actually exists, and (b) two genuinely concurrent ensureTenant-style
// upserts for a brand-new owner_id produce exactly one tenant row, not two.
//
// tenants.owner_id has a real FK to auth.users(id), so a fresh throwaway
// auth user is created for the test (and deleted after) rather than using
// a random UUID, which would just fail with a foreign-key violation
// (23503) and not exercise the unique constraint (23505) at all.
//
// Usage: node --env-file=.env.local src/scripts/verify-tenant-unique-constraint.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createThrowawayUser(label) {
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `constraint-probe-${label}-${Date.now()}@example.com`,
      password: "ProbeTest#12345",
      email_confirm: true,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`createThrowawayUser failed: ${JSON.stringify(body)}`);
  return body.id ?? body.user?.id;
}

async function deleteUser(userId) {
  await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` },
  });
}

async function upsertAttempt(ownerId, label) {
  const res = await fetch(`${url}/rest/v1/tenants`, {
    method: "POST",
    headers: {
      apikey: svcKey,
      Authorization: `Bearer ${svcKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify({ owner_id: ownerId, business_name: `Concurrent Test ${label}`, plan: "starter" }),
  });
  const body = await res.json().catch(() => null);
  return { label, status: res.status, rowCount: Array.isArray(body) ? body.length : 0, body };
}

console.log("=== Step 4a: confirm the unique constraint exists ===");
const probeUserId = await createThrowawayUser("probe");
console.log("  created throwaway auth user:", probeUserId);

const first = await fetch(`${url}/rest/v1/tenants`, {
  method: "POST",
  headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ owner_id: probeUserId, business_name: "Constraint Probe 1", plan: "starter" }),
});
const firstBody = await first.json();
console.log("  first insert:", first.status, JSON.stringify(firstBody).slice(0, 150));

const second = await fetch(`${url}/rest/v1/tenants`, {
  method: "POST",
  headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
  body: JSON.stringify({ owner_id: probeUserId, business_name: "Constraint Probe 2", plan: "starter" }),
});
const secondBody = await second.json();
console.log("  second insert (same owner_id, no conflict handling):", second.status, JSON.stringify(secondBody).slice(0, 300));

const constraintLive = secondBody?.code === "23505";
console.log("  CONSTRAINT LIVE (real unique_violation on second insert):", constraintLive);

// Cleanup probe data.
await fetch(`${url}/rest/v1/tenants?owner_id=eq.${probeUserId}`, {
  method: "DELETE",
  headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` },
});
await deleteUser(probeUserId);

if (!constraintLive) {
  console.log("\n!!! Constraint is NOT live yet -- migration_v38.sql has not been run (or hasn't reloaded schema cache). Stopping here. !!!");
  process.exit(1);
}

console.log("\n=== Step 4b: real concurrent-request test ===");
const testUserId = await createThrowawayUser("concurrent");
console.log("  fresh throwaway auth user:", testUserId);

const [r1, r2] = await Promise.all([
  upsertAttempt(testUserId, "A"),
  upsertAttempt(testUserId, "B"),
]);
console.log("  concurrent upsert A:", JSON.stringify(r1));
console.log("  concurrent upsert B:", JSON.stringify(r2));

const check = await fetch(`${url}/rest/v1/tenants?owner_id=eq.${testUserId}&select=id,business_name,created_at`, {
  headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` },
});
const finalRows = await check.json();
console.log(`\n  FINAL row count for this fresh owner_id: ${finalRows.length} (must be exactly 1)`);
console.log(JSON.stringify(finalRows, null, 2));

// Cleanup.
await fetch(`${url}/rest/v1/tenants?owner_id=eq.${testUserId}`, {
  method: "DELETE",
  headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` },
});
await deleteUser(testUserId);
console.log("\ntest data cleaned up.");
console.log(finalRows.length === 1 ? "\n✅ PASS -- exactly one row." : "\n❌ FAIL -- race condition still reproducible.");
