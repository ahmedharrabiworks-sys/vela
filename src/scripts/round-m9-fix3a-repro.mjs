import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const authState = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
const authCookie = authState.cookies.find((c) => c.name.includes("auth-token"));
const rawValue = authCookie.value.startsWith("base64-") ? authCookie.value.slice(7) : authCookie.value;
const decoded = JSON.parse(Buffer.from(rawValue, "base64").toString("utf-8"));
const userId = decoded.user.id;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: tenant } = await admin.from("tenants").select("id, business_name").eq("owner_id", userId).maybeSingle();
console.log("Testing against real tenant:", tenant.id, tenant.business_name);

const serviceName = "Round M9 Repro Untrained Service " + Date.now();
const baseUrl = "https://vela-g8h4.vercel.app";

// Clean slate: no pending_service_requests row for this service name yet
// (name is unique-timestamped so this is guaranteed).

console.log("\n--- Submission 1: customer A, NO date/time given ---");
const r1 = await fetch(`${baseUrl}/api/widget/structured-booking`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: tenant.id,
    name: "Customer A (repro)",
    phone: "+15550001111",
    service: serviceName,
    // no date/time -- simulates the common case of the FIRST request for a
    // brand new untrained service arriving without a preferred time
  }),
});
console.log("status:", r1.status, await r1.json());

const { data: rowAfter1 } = await admin
  .from("pending_service_requests")
  .select("id, lead_id, status")
  .eq("tenant_id", tenant.id)
  .ilike("service_name", serviceName)
  .maybeSingle();
console.log("pending_service_requests row after submission 1:", rowAfter1);

console.log("\n--- Submission 2: customer B, WITH full date/time (the real repro case) ---");
const r2 = await fetch(`${baseUrl}/api/widget/structured-booking`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: tenant.id,
    name: "Customer B (repro)",
    phone: "+15550002222",
    service: serviceName,
    date: "2026-09-15",
    time: "14:00",
  }),
});
console.log("status:", r2.status, await r2.json());

const { data: rowAfter2 } = await admin
  .from("pending_service_requests")
  .select("id, lead_id, status")
  .eq("tenant_id", tenant.id)
  .ilike("service_name", serviceName)
  .maybeSingle();
console.log("\npending_service_requests row after submission 2:", rowAfter2);

const { data: leadB } = await admin.from("leads").select("id, name, phone, form_data").eq("phone", "+15550002222").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
console.log("Customer B's real lead row:", leadB);

console.log("\n=== DIAGNOSIS ===");
if (rowAfter2?.lead_id === leadB?.id) {
  console.log("PASS-ish: pending_service_requests.lead_id already points to Customer B (the one with real date/time).");
} else {
  console.log("BUG CONFIRMED: pending_service_requests.lead_id is", rowAfter2?.lead_id, "but Customer B's real lead (with the preferred_datetime) is", leadB?.id, "-- the confirm-service flow will read the WRONG lead's form_data and find no date/time, asking the customer again.");
}

// cleanup: dismiss the repro row + remove the two test leads so this never
// pollutes the real Train Your AI queue or Leads list.
if (rowAfter2?.id) await admin.from("pending_service_requests").update({ status: "dismissed" }).eq("id", rowAfter2.id);
const { data: leadA } = await admin.from("leads").select("id").eq("phone", "+15550001111").eq("tenant_id", tenant.id).maybeSingle();
if (leadA?.id) await admin.from("leads").delete().eq("id", leadA.id);
if (leadB?.id) await admin.from("leads").delete().eq("id", leadB.id);
console.log("\n(cleanup done: repro leads deleted, pending_service_requests row dismissed)");
