import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const anon = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const testEmail = `vela-security-review-${Date.now()}@example.com`;
const testPass = "TempReview" + Math.random().toString(36).slice(2) + "!9x";

console.log("Signing up disposable test account (will be deleted after check)...");
const { data, error } = await anon.auth.signUp({ email: testEmail, password: testPass });

if (error) {
  console.log("SIGNUP ERROR:", error.message);
  process.exit(1);
}

console.log("\n=== RESULT ===");
console.log("user.id:", data.user?.id);
console.log("user.confirmed_at:", data.user?.confirmed_at ?? "(null — not confirmed)");
console.log("user.email_confirmed_at:", data.user?.email_confirmed_at ?? "(null — not confirmed)");
console.log("session present immediately:", !!data.session);

if (data.session) {
  console.log("\n>>> CONCLUSION: Email confirmation is OFF — signup grants an immediate active session with no verification step.");
} else {
  console.log("\n>>> CONCLUSION: Email confirmation is ON — no session until the user clicks the confirmation link.");
}

// Cleanup — delete the disposable test user so no junk data is left behind.
if (data.user?.id) {
  const { error: delErr } = await admin.auth.admin.deleteUser(data.user.id);
  console.log("\nCleanup: deleted test user —", delErr ? `FAILED: ${delErr.message}` : "OK");
}
