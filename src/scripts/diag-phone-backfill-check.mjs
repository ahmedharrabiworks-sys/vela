import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: tenants, error } = await admin
  .from("tenants")
  .select("id, business_name, phone, created_at")
  .order("created_at", { ascending: true });

if (error) {
  console.log("Query error:", error.message);
  process.exit(1);
}

console.log(`Total tenants: ${tenants.length}\n`);

let empty = 0, validE164 = 0, malformed = 0;
const malformedRows = [];

for (const t of tenants) {
  const raw = (t.phone ?? "").trim();
  if (!raw) { empty++; continue; }

  const isE164Shaped = /^\+[1-9]\d{1,14}$/.test(raw);
  const isValid = isE164Shaped && isValidPhoneNumber(raw);

  if (isValid) {
    validE164++;
  } else {
    malformed++;
    const parsed = parsePhoneNumberFromString(raw);
    malformedRows.push({
      id: t.id,
      business_name: t.business_name,
      raw_phone: raw,
      created_at: t.created_at,
      note: !isE164Shaped ? "not E.164-shaped (missing + or has formatting chars)" : "E.164-shaped but not a valid number",
      couldRecoverAs: parsed?.isValid() ? parsed.number : null,
    });
  }
}

console.log(`Empty phone:        ${empty}`);
console.log(`Valid E.164:        ${validE164}`);
console.log(`Malformed:          ${malformed}`);

if (malformedRows.length > 0) {
  console.log("\n=== MALFORMED PHONE RECORDS (not auto-fixed) ===");
  for (const r of malformedRows) {
    console.log(`- tenant ${r.id} ("${r.business_name}"): raw="${r.raw_phone}" | ${r.note}${r.couldRecoverAs ? ` | could recover as: ${r.couldRecoverAs}` : " | could not be parsed into any valid number"}`);
  }
}
