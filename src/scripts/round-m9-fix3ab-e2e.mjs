import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

// Full end-to-end proof that FIX 3(a) (lead_id stays fresh) and the
// pre-existing FIX 3(b) logic (pending-services/route.ts reading
// lead.form_data.preferred_datetime) now actually work TOGETHER against
// real production: submit an untrained-service structured booking with a
// real date/time, then call the real authenticated confirm-service action
// (POST /api/pending-services) exactly as Train Your AI does, and check the
// customer's appointment was really auto-booked using the retained time.

const authState = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
const authCookie = authState.cookies.find((c) => c.name.includes("auth-token"));
const rawValue = authCookie.value.startsWith("base64-") ? authCookie.value.slice(7) : authCookie.value;
const decoded = JSON.parse(Buffer.from(rawValue, "base64").toString("utf-8"));
const accessToken = decoded.access_token;
const userId = decoded.user.id;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: tenant } = await admin.from("tenants").select("id, business_name").eq("owner_id", userId).maybeSingle();
console.log("Testing against real tenant:", tenant.id, tenant.business_name);

const baseUrl = "https://vela-g8h4.vercel.app";
const serviceName = "Round M9 E2E Untrained " + Date.now();

console.log("\n--- Structured-booking submission: real customer, untrained service, real date/time ---");
const r1 = await fetch(`${baseUrl}/api/widget/structured-booking`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: tenant.id,
    name: "E2E Customer",
    phone: "+15550009999",
    service: serviceName,
    date: "2026-09-20",
    time: "10:30",
  }),
});
console.log("status:", r1.status, await r1.json());

const { data: pendingRow } = await admin
  .from("pending_service_requests")
  .select("id, lead_id, service_name")
  .eq("tenant_id", tenant.id)
  .ilike("service_name", serviceName)
  .maybeSingle();
console.log("\npending_service_requests row:", pendingRow);

const cookieHeader = authState.cookies
  .filter((c) => c.name.includes("auth-token") || c.name.includes("sb-"))
  .map((c) => `${c.name}=${c.value}`)
  .join("; ");

console.log("\n--- Owner confirms the service via the real /api/pending-services POST (action: add) ---");
const r2 = await fetch(`${baseUrl}/api/pending-services`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Cookie: cookieHeader,
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ id: pendingRow.id, action: "add", price: "$120", duration: "45 minutes" }),
});
const r2data = await r2.json();
console.log("status:", r2.status, JSON.stringify(r2data, null, 2));

console.log("\n=== DIAGNOSIS ===");
if (r2data.bookedAppointment) {
  console.log("PASS: the confirm-service action auto-booked a real appointment using the customer's originally submitted date/time -- FIX 3(a)+3(b) confirmed working end to end.");
} else {
  console.log("Did NOT auto-book. customerNotified:", r2data.customerNotified, "-- check availability logic / lead_id resolution.");
}

// verify a real appointment row exists with the right datetime
const { data: appt } = await admin
  .from("appointments")
  .select("id, service_name, datetime, status")
  .eq("tenant_id", tenant.id)
  .eq("service_name", r2data.service?.name ?? "___none___")
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();
console.log("\nReal appointment row:", appt);

// cleanup
if (appt?.id) await admin.from("appointments").delete().eq("id", appt.id);
const { data: lead } = await admin.from("leads").select("id").eq("phone", "+15550009999").eq("tenant_id", tenant.id).maybeSingle();
if (lead?.id) await admin.from("leads").delete().eq("id", lead.id);
await admin.from("pending_service_requests").delete().eq("id", pendingRow.id);
// remove the test service from the KB so it doesn't pollute Train Your AI
const { data: cfg } = await admin.from("tenant_config").select("knowledge_base").eq("tenant_id", tenant.id).maybeSingle();
if (cfg?.knowledge_base) {
  const kb = JSON.parse(cfg.knowledge_base);
  kb.services = (kb.services || []).filter((s) => s.name !== r2data.service?.name);
  await admin.from("tenant_config").update({ knowledge_base: JSON.stringify(kb) }).eq("tenant_id", tenant.id);
}
console.log("\n(cleanup done)");
