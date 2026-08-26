import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

// Extract the real access token from the stored Playwright auth session
// (the SAME test account used throughout this project's live verification).
const authState = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
const authCookie = authState.cookies.find((c) => c.name.includes("auth-token"));
const rawValue = authCookie.value.startsWith("base64-") ? authCookie.value.slice(7) : authCookie.value;
const decoded = JSON.parse(Buffer.from(rawValue, "base64").toString("utf-8"));
const accessToken = decoded.access_token;
const userId = decoded.user.id;
console.log("Testing as real user:", userId, decoded.user.email);

// A client authenticated as the REAL end user (anon key + their real access
// token) -- exactly what settings/page.tsx's getSupabase() client is,
// subject to the SAME real RLS policies. No admin client involved.
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
});

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const { data: before } = await admin.from("tenants").select("id, business_name").eq("owner_id", userId).maybeSingle();
console.log("business_name BEFORE:", before?.business_name);

const testName = "Round M9 Repro Name " + Date.now();
console.log("\nAttempting the EXACT settings/page.tsx upsert call (onConflict: 'owner_id')...");
const { data, error } = await client
  .from("tenants")
  .upsert({ owner_id: userId, business_name: testName, industry: before ? undefined : "Other", city: "", phone: "", website: "", plan: "pro" }, { onConflict: "owner_id" });

console.log("\n=== REAL result ===");
console.log("data:", JSON.stringify(data));
console.log("error:", JSON.stringify(error));

const { data: after } = await admin.from("tenants").select("id, business_name").eq("owner_id", userId).maybeSingle();
console.log("\nbusiness_name AFTER:", after?.business_name);
console.log(after?.business_name === testName ? "PASS: name actually changed in DB" : "FAIL: name did NOT change in DB despite no thrown exception");
