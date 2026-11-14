// Publishes a generated demo as a private page: velaos.co/demo/<token>.
// Uploads the sample call to the private "demo-audio" bucket and inserts one
// demo_pages row (expires in 30 days). Needs supabase/migration_v44.sql.
// The token is long and random, never the business name.
// Usage: node sales/scripts/demo-publish.mjs <slug>
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA, config, env, findLead, readLeads, writeLeads } from "./lib.mjs";

const slug = process.argv[2];
const file = path.join(DATA, "demos", `${slug}.json`);
const demo = JSON.parse(fs.readFileSync(file, "utf8"));
if (!demo.generated?.call_mp3) throw new Error(`${slug}: generate the audio first (demo-voice.mjs)`);
const e = env(), cfg = config();
const SB = e.NEXT_PUBLIC_SUPABASE_URL, KEY = e.SUPABASE_SERVICE_ROLE_KEY;
if (!SB || !KEY) throw new Error("Supabase URL / service role key missing in .env.local");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const token = demo.token ?? crypto.randomBytes(30).toString("base64url"); // 40 characters
const callPath = `${token}/call.mp3`;

const up = await fetch(`${SB}/storage/v1/object/demo-audio/${callPath}`, {
  method: "POST", headers: { ...H, "Content-Type": "audio/mpeg", "x-upsert": "true" },
  body: fs.readFileSync(path.join(DATA, demo.generated.call_mp3)),
});
if (!up.ok) throw new Error(`audio upload failed ${up.status}: ${(await up.text()).slice(0, 200)} (did migration_v44 run?)`);

const row = {
  token,
  business_name: demo.business,
  business_name_ar: demo.business_ar ?? null,
  data: { default_lang: "ar", services: (demo.services ?? []).slice(0, 5), call_path: callPath, demo_number: cfg.DEMO_NUMBER || "" },
  expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
};
const ins = await fetch(`${SB}/rest/v1/demo_pages?on_conflict=token`, {
  method: "POST", headers: { ...H, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(row),
});
if (!ins.ok) throw new Error(`demo_pages insert failed ${ins.status}: ${(await ins.text()).slice(0, 200)} (did migration_v44 run?)`);

demo.token = token;
demo.published = { url: `${cfg.demo_base_url}${token}`, expires_at: row.expires_at, at: new Date().toISOString() };
fs.writeFileSync(file, JSON.stringify(demo, null, 1));
const leads = readLeads();
findLead(leads, slug).demo_token = token;
writeLeads(leads);
console.log(`${slug}: published, expires ${row.expires_at.slice(0, 10)}`);
