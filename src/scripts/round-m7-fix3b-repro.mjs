import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: users } = await admin.auth.admin.listUsers();
const testUser = users.users.find(u => u.email === process.env.TEST_ACCOUNT_EMAIL);
const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", testUser.id).maybeSingle();

// Seed a KNOWN starting knowledge_base with 1 existing service.
await admin.from("tenant_config").upsert({
  tenant_id: tenant.id,
  knowledge_base: JSON.stringify({
    services: [{ name: "Existing Service", price: "$10", duration: "30 min", description: "" }],
    faqs: [], business: { hours: "", address: "", bookingPolicy: "", tone: "professional" }, extra: "",
  }),
}, { onConflict: "tenant_id" });
console.log("Seeded known KB with 1 existing service.");

// Insert a fresh pending_service_requests row for this tenant.
const { data: pendingRow, error: insErr } = await admin.from("pending_service_requests").insert({
  tenant_id: tenant.id,
  service_name: "Round M7 Repro Service",
}).select("id").single();
if (insErr) { console.error("insert error:", insErr); process.exit(1); }
console.log("Created pending_service_requests row:", pendingRow.id);

// Call the REAL production /api/pending-services POST route with action:"add".
const authState = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
const cookieHeader = authState.cookies.map(c => `${c.name}=${c.value}`).join("; ");

const res = await fetch("https://vela-g8h4.vercel.app/api/pending-services", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Cookie": cookieHeader },
  body: JSON.stringify({ id: pendingRow.id, action: "add", price: "$99", duration: "45 min" }),
});
const data = await res.json().catch(() => ({}));
console.log("\n=== REAL production response ===");
console.log("status:", res.status);
console.log("body:", JSON.stringify(data, null, 2));

// Now query the DB DIRECTLY to see what's actually there.
const { data: cfg } = await admin.from("tenant_config").select("knowledge_base, knowledge_base_updated_at").eq("tenant_id", tenant.id).maybeSingle();
const kb = cfg?.knowledge_base ? JSON.parse(cfg.knowledge_base) : null;
console.log("\n=== REAL DB state after the call ===");
console.log("knowledge_base_updated_at:", cfg?.knowledge_base_updated_at);
console.log("services:", JSON.stringify(kb?.services, null, 2));

const { data: rowAfter } = await admin.from("pending_service_requests").select("status").eq("id", pendingRow.id).maybeSingle();
console.log("pending_service_requests row status:", rowAfter?.status);
