/**
 * Unit test for rate-limit-db.ts's fail-safe fallback behavior (FIX 1).
 * Since auth_rate_hit()/auth_email_status() are Postgres functions, they
 * can't be unit tested outside a live DB -- what CAN and must be verified
 * here is the TypeScript wrapper's own logic: when the RPC call fails
 * (migration not run, network error, anything), it must fall back to the
 * in-memory limiter rather than crash or silently allow everything through.
 * Achieved by pointing the Supabase admin client at an address that will
 * genuinely fail (not a live project), which deterministically exercises
 * the catch/fallback path -- a real failure, not a hand-written stub.
 */
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://invalid-test-project-does-not-exist.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "invalid-test-key";

import { rateHit, getEmailAccountStatus, peekRateCount } from "../lib/auth/rate-limit-db";
import { isRateLimited, peekAttemptCount } from "../lib/auth/rate-limit";

let pass = 0;
let fail = 0;
function check(label: string, cond: boolean) {
  if (cond) { console.log(`PASS ${label}`); pass++; }
  else { console.log(`FAIL ${label}`); fail++; }
}

async function main() {
  // 1. rateHit falls back to in-memory when the RPC genuinely fails, and
  //    correctly allows the first N calls within the limit.
  const key1 = `test:fallback:${Date.now()}`;
  const r1 = await rateHit(key1, 3, 60);
  check("rateHit falls back on RPC failure (usedFallback=true)", r1.usedFallback === true);
  check("rateHit allows request 1/3", r1.allowed === true);

  const r2 = await rateHit(key1, 3, 60);
  const r3 = await rateHit(key1, 3, 60);
  check("rateHit allows request 2/3", r2.allowed === true);
  check("rateHit allows request 3/3", r3.allowed === true);

  const r4 = await rateHit(key1, 3, 60);
  check("rateHit blocks request 4/3 (over limit)", r4.allowed === false);

  // 2. Fallback path's remaining-count matches the in-memory bucket's real
  //    count -- isRateLimited() intentionally plateaus the counter at the
  //    limit once blocking starts (call 4 was blocked without incrementing),
  //    so 3 hits landed, not 4, even though rateHit() was called 4 times.
  const directCount = peekAttemptCount(key1);
  check("in-memory bucket count plateaus at the limit (3), not 4", directCount === 3);

  // 3. A fresh key in a fresh window is allowed.
  const key2 = `test:fresh:${Date.now()}`;
  const r5 = await rateHit(key2, 1, 60);
  check("fresh key is allowed", r5.allowed === true);
  const r6 = await rateHit(key2, 1, 60);
  check("second hit on limit=1 is blocked", r6.allowed === false);

  // 4. getEmailAccountStatus fails safe to null (never guesses "none") when unavailable.
  const status = await getEmailAccountStatus("nobody@example.com");
  check("getEmailAccountStatus returns null on lookup failure (never guesses)", status === null);

  // 5. peekRateCount also fails safe to null rather than throwing.
  const peeked = await peekRateCount(key1, 60);
  check("peekRateCount returns null when DB table is unreachable (fails safe)", peeked === null);

  // 6. Underlying in-memory primitive sanity (isRateLimited's own contract).
  const key3 = `test:direct:${Date.now()}`;
  check("isRateLimited allows 1st call", isRateLimited(key3, 2, 60_000) === false);
  check("isRateLimited allows 2nd call", isRateLimited(key3, 2, 60_000) === false);
  check("isRateLimited blocks 3rd call", isRateLimited(key3, 2, 60_000) === true);

  console.log(`\n${pass}/${pass + fail} checks passed.`);
  if (fail > 0) process.exit(1);
}

main();
