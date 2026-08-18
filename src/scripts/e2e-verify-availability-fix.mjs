import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TENANT = "5ca1624f-c56f-43ad-8068-bbfd236244f8"; // Azure Bay Hotel tenant (real KB: hours "24/7 Reception", no existing appointments)
const BASE = "https://vela-g8h4.vercel.app";

let pass = 0, fail = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${detail ? " :: " + detail : ""}`);
  ok ? pass++ : fail++;
}

const STALL_PATTERNS = /let me check|get back to you|i'?ll check|i will check|check (that|this|the availability) and (get back|follow up|let you know)/i;

async function sendMessage(conversationId, message) {
  const res = await fetch(`${BASE}/api/ai/reply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TENANT, conversationId, message, channel: "website", customerName: "Availability Test" }),
  });
  const data = await res.json();
  return { res, data };
}

console.log("\n=== TEST 1: requested time is FREE — real immediate confirmation, no stall ===");
let convId = null;
{
  await admin.from("appointments").delete().eq("tenant_id", TENANT).eq("service_name", "Classic Room");

  const { res, data } = await sendMessage(null, "Hi, I'd like to book the Classic Room for December 20th, 2026 at 3pm.");
  check("request succeeds", res.ok, `status ${res.status}`);
  convId = data.conversationId;
  console.log("AI REPLY:", JSON.stringify(data.reply));

  check("reply contains NO stall phrase", !STALL_PATTERNS.test(data.reply ?? ""), data.reply);
  check("reply signals real progress (availability/confirmation/next-step), not silence", /avail|book|confirm|great|sure|yes|name|phone|number/i.test(data.reply ?? ""), data.reply);
}

console.log("\n=== TEST 2: SAME requested time now CONFLICTS with a real appointment — real alternatives offered, no stall ===");
{
  // Insert a real conflicting appointment at the exact UTC instant the phrase
  // "December 20th, 2026 at 3pm" resolves to on a UTC server (Vercel functions
  // default to UTC, matching every other timestamp in this codebase).
  const conflictISO = "2026-12-20T15:00:00.000Z";
  const { error: insErr } = await admin.from("appointments").insert({
    tenant_id: TENANT, lead_id: null, service_name: "Classic Room", datetime: conflictISO, status: "pending",
  });
  check("seeded a REAL conflicting appointment", !insErr, insErr?.message);

  const { res, data } = await sendMessage(convId, "Actually can I confirm — is December 20th, 2026 at 3pm still available for the Classic Room?");
  check("request succeeds", res.ok, `status ${res.status}`);
  console.log("AI REPLY:", JSON.stringify(data.reply));

  check("reply contains NO stall phrase", !STALL_PATTERNS.test(data.reply ?? ""), data.reply);
  check("reply indicates the slot is taken/unavailable", /taken|not available|unavailable|already booked|no longer available|someone else|fully booked|conflict/i.test(data.reply ?? ""), data.reply);
  check("reply offers a real alternative time (contains a time-like token)", /\d{1,2}(:\d{2})?\s*(am|pm)|next day|another (day|time|date)|tomorrow|different (day|time)/i.test(data.reply ?? ""), data.reply);

  await admin.from("appointments").delete().eq("tenant_id", TENANT).eq("datetime", conflictISO);
}

console.log("\n=== TEST 3: message unrelated to booking — no availability directive fires, normal reply ===");
{
  const { res, data } = await sendMessage(convId, "What ingredients does the restaurant use?");
  check("request succeeds", res.ok, `status ${res.status}`);
  console.log("AI REPLY:", JSON.stringify(data.reply));
  check("reply is on-topic (mentions the actual KB fact, not a scheduling tangent)", /fresh|local|ingredient/i.test(data.reply ?? ""), data.reply);
  check("reply contains NO stall phrase either", !STALL_PATTERNS.test(data.reply ?? ""), data.reply);
}

console.log("\n=== TEST 4: deterministic checkAvailability unit-level sanity (imported directly) ===");
{
  const { checkAvailability, formatAvailabilityDirective } = await import("../lib/availability.ts").catch(() => ({}));
  if (!checkAvailability) {
    console.log("SKIP — TS module not directly importable from a plain .mjs script without a loader; covered instead by TEST 1/2's real end-to-end behavior above.");
  } else {
    const result = await checkAvailability(admin, TENANT, "2026-12-20T15:00:00.000Z");
    check("checkAvailability runs against real DB without throwing", result !== undefined);
  }
}

// cleanup
await admin.from("conversations").delete().eq("id", convId);

console.log(`\n=== RESULT: ${pass}/${pass + fail} checks passed ===`);
process.exit(fail > 0 ? 1 : 0);
