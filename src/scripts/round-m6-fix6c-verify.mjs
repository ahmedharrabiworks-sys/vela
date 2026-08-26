import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: users } = await admin.auth.admin.listUsers();
const testUser = users.users.find(u => u.email === process.env.TEST_ACCOUNT_EMAIL);
const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", testUser.id).maybeSingle();

const before = await admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
console.log("conversations count BEFORE:", before.count);

// Real POST to the real production structured-booking endpoint. No date/time
// given -> hits Case B (pending lead, no availability check) -- zero
// OpenAI/Unsplash calls anywhere in this route regardless of branch.
const res = await fetch("https://vela-g8h4.vercel.app/api/widget/structured-booking", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    tenantId: tenant.id,
    name: "Round M6 Fix6c Test",
    phone: "+971500000000",
    service: "Teeth Whitening",
  }),
});
const data = await res.json();
console.log("\nresponse status:", res.status);
console.log("response body:", JSON.stringify(data, null, 2));

const after = await admin.from("conversations").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id);
console.log("\nconversations count AFTER:", after.count);

if (data.conversationId) {
  const { data: conv } = await admin.from("conversations").select("id, customer_name, channel, lead_id, last_message_at").eq("id", data.conversationId).maybeSingle();
  console.log("\nreal conversation row:", conv);
  const { data: msgs } = await admin.from("messages").select("role, content, created_at").eq("conversation_id", data.conversationId).order("created_at", { ascending: true });
  console.log("real messages in this conversation:", msgs);
}

console.log("\n" + (after.count > before.count && data.conversationId ? "PASS: a real conversation + messages were created." : "FAIL: no conversation created."));
