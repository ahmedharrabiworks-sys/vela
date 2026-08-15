import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter(l => l.includes("=")).map(l => { const i = l.indexOf("="); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; }));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TENANT = "5ca1624f-c56f-43ad-8068-bbfd236244f8"; // Azure Bay Hotel tenant
const BASE = "https://vela-g8h4.vercel.app";

let pass = 0, fail = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "PASS" : "FAIL"} — ${label}${detail ? " :: " + detail : ""}`);
  ok ? pass++ : fail++;
}

console.log("\n=== CHECK 0: does messages.is_owner_reply column exist? (migration_v27.sql) ===");
{
  const { error } = await admin.from("messages").select("is_owner_reply").eq("tenant_id", TENANT).limit(1);
  check("migration_v27.sql (messages.is_owner_reply) is live", !error, error ? error.message : "column readable");
}

console.log("\n=== FIX 5: lead only created once real contact info appears ===");
{
  const before = await admin.from("leads").select("id").eq("tenant_id", TENANT);
  const beforeCount = before.data?.length ?? 0;

  // Message with NO contact info -- should create a conversation, NOT a lead.
  const r1 = await fetch(`${BASE}/api/ai/reply`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TENANT, message: "Hi, what are your opening hours?", channel: "website", customerName: "Website Visitor" }),
  });
  const d1 = await r1.json();
  check("no-contact-info message succeeds", r1.ok, `status ${r1.status}`);

  const { data: conv1 } = await admin.from("conversations").select("id, lead_id").eq("id", d1.conversationId).maybeSingle();
  check("conversation created with lead_id = null (no contact info given)", conv1 && conv1.lead_id === null, JSON.stringify(conv1));

  const afterNoContact = await admin.from("leads").select("id").eq("tenant_id", TENANT);
  check("NO new lead row created for contact-less conversation", (afterNoContact.data?.length ?? 0) === beforeCount, `before=${beforeCount} after=${afterNoContact.data?.length}`);

  // Now send a phone number in the SAME conversation -- a lead should be created and linked.
  const r2 = await fetch(`${BASE}/api/ai/reply`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TENANT, conversationId: d1.conversationId, message: "You can reach me at +216 55 123 456", channel: "website", customerName: "Website Visitor" }),
  });
  check("follow-up message with phone succeeds", r2.ok, `status ${r2.status}`);

  await new Promise((res) => setTimeout(res, 1500)); // let the write settle
  const { data: conv2 } = await admin.from("conversations").select("id, lead_id").eq("id", d1.conversationId).maybeSingle();
  check("conversation NOW has a lead_id linked", conv2 && conv2.lead_id !== null, JSON.stringify(conv2));

  if (conv2?.lead_id) {
    const { data: lead } = await admin.from("leads").select("id, phone, tenant_id").eq("id", conv2.lead_id).maybeSingle();
    check("linked lead has the real phone number captured", lead?.phone === "+21655123456" || lead?.phone?.includes("55123456"), JSON.stringify(lead));
  }

  // cleanup
  await admin.from("conversations").delete().eq("id", d1.conversationId);
  if (conv2?.lead_id) await admin.from("leads").delete().eq("id", conv2.lead_id);
}

console.log("\n=== FIX 4: widget history endpoint + persistence ===");
{
  const r1 = await fetch(`${BASE}/api/ai/reply`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId: TENANT, message: "Testing FIX 4 persistence", channel: "website", customerName: "Website Visitor" }),
  });
  const d1 = await r1.json();
  check("conversation created for history test", r1.ok && !!d1.conversationId, `status ${r1.status}`);

  const r2 = await fetch(`${BASE}/api/widget/history?tenantId=${TENANT}&conversationId=${d1.conversationId}`);
  const d2 = await r2.json();
  check("history endpoint returns the real message", r2.ok && d2.messages?.some((m) => m.content === "Testing FIX 4 persistence"), JSON.stringify(d2.messages?.map((m)=>m.content)));

  // Wrong tenant should NOT see this conversation's history (scoping check)
  const r3 = await fetch(`${BASE}/api/widget/history?tenantId=00000000-0000-0000-0000-000000000000&conversationId=${d1.conversationId}`);
  const d3 = await r3.json();
  check("history endpoint scoped -- wrong tenantId returns empty", r3.ok && (d3.messages?.length ?? 0) === 0, JSON.stringify(d3));

  await admin.from("conversations").delete().eq("id", d1.conversationId);
}

console.log("\n=== FIX 2 + FIX 3: owner Takeover reply -- real delivery + correct labeling ===");
{
  // Create a conversation, turn AI off (Takeover), send an owner reply through the real endpoint,
  // and confirm it's both delivered (visible via widget/history) AND tagged is_owner_reply=true.
  const { data: conv } = await admin.from("conversations").insert({
    tenant_id: TENANT, lead_id: null, channel: "website", customer_name: "FIX2/3 Test Visitor",
    ai_enabled: false, last_message_at: new Date().toISOString(),
  }).select("id").single();
  check("test conversation created with ai_enabled=false (Takeover state)", !!conv?.id);

  // NOTE: /api/conversations/[id]/reply requires an authenticated owner session (cookie-based),
  // which this script cannot obtain. We verify the INSERT CONTRACT directly against the same
  // admin client + is_owner_reply flag the route sets, then verify FIX 3's polling-consumable
  // read path (widget/history) sees it -- this is the real, deployed data path the route writes to.
  const { error: insErr } = await admin.from("messages").insert({
    conversation_id: conv.id, tenant_id: TENANT, role: "assistant",
    content: "Thanks for reaching out -- this is Sarah from the front desk.",
    is_test: false, is_owner_reply: true,
  });
  check("owner-reply insert with is_owner_reply=true succeeds (column live)", !insErr, insErr?.message);

  const { data: msgRow } = await admin.from("messages").select("role, is_owner_reply, is_test").eq("conversation_id", conv.id).eq("is_owner_reply", true).maybeSingle();
  check("stored row is role=assistant + is_owner_reply=true (distinguishable from real AI replies)", msgRow?.role === "assistant" && msgRow?.is_owner_reply === true, JSON.stringify(msgRow));

  const rHist = await fetch(`${BASE}/api/widget/history?tenantId=${TENANT}&conversationId=${conv.id}`);
  const dHist = await rHist.json();
  check("FIX 3: owner reply IS delivered to the widget history endpoint (real delivery, not silent)", dHist.messages?.some((m) => m.role === "assistant" && m.content.includes("Sarah from the front desk")), JSON.stringify(dHist.messages));

  await admin.from("conversations").delete().eq("id", conv.id);
}

console.log("\n=== FIX 1: conversation rename + delete API routes (auth-gated, expect 401 anonymous) ===");
{
  const { data: conv } = await admin.from("conversations").insert({
    tenant_id: TENANT, lead_id: null, channel: "website", customer_name: "Rename/Delete Target",
    ai_enabled: true, last_message_at: new Date().toISOString(),
  }).select("id").single();

  const rPatch = await fetch(`${BASE}/api/conversations/${conv.id}`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "Hacked Name" }),
  });
  check("PATCH rename route exists + is auth-gated (401 without session)", rPatch.status === 401, `status ${rPatch.status}`);

  const rDelete = await fetch(`${BASE}/api/conversations/${conv.id}`, { method: "DELETE" });
  check("DELETE route exists + is auth-gated (401 without session)", rDelete.status === 401, `status ${rDelete.status}`);

  // Confirm the row was NOT touched by the unauthenticated attempts
  const { data: untouched } = await admin.from("conversations").select("customer_name").eq("id", conv.id).maybeSingle();
  check("row unchanged after rejected anonymous PATCH/DELETE", untouched?.customer_name === "Rename/Delete Target", JSON.stringify(untouched));

  // Now exercise the actual DB operations the routes perform (server-side contract), via admin client
  const { error: renameErr } = await admin.from("conversations").update({ customer_name: "Renamed via Test" }).eq("id", conv.id);
  check("rename write contract (customer_name update) succeeds", !renameErr, renameErr?.message);

  const { data: msgForCascade } = await admin.from("messages").insert({ conversation_id: conv.id, tenant_id: TENANT, role: "user", content: "cascade test", is_test: false }).select("id").single();
  const { error: deleteErr } = await admin.from("conversations").delete().eq("id", conv.id);
  check("delete write contract succeeds", !deleteErr, deleteErr?.message);
  const { data: orphanCheck } = await admin.from("messages").select("id").eq("id", msgForCascade?.id).maybeSingle();
  check("FK CASCADE: deleting conversation also deleted its message (no orphan)", !orphanCheck, JSON.stringify(orphanCheck));
}

console.log(`\n=== RESULT: ${pass}/${pass + fail} checks passed ===`);
process.exit(fail > 0 ? 1 : 0);
