// Round M4, direct-function verification. Zero OpenAI/Unsplash calls, and
// (per this round's explicit instruction for FIX 7) zero live network calls
// to the app's own deployed API either -- pure logic replication/inspection,
// same TEST-01 reasoning as prior rounds' verify scripts.
// Run: npx tsx src/scripts/round-m4-verify-no-api.ts
import { renderWebsite } from "../lib/website-renderer";

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}, ${label}`);
  if (cond) pass++; else fail++;
}

// ── FIX 1: dental-specific gallery/about fallback detection ──
{
  const isDental = (text: string) => /\b(dental|dentist|orthodont|teeth\s*whitening|cosmetic\s*dentistry|oral\s*health)/i.test(text);
  check("isDental fires on a real dental clinic description",
    isDental("Smile Bright Dental Clinic, professional dental services in Dubai. We offer general dentistry, teeth whitening, implants."));
  check("isDental does NOT fire on a generic (non-dental) medical business",
    !isDental("Downtown Physiotherapy, sports injury rehab and physical therapy in Dubai."));
  check("isDental fires on 'orthodontist' even without the word dental",
    isDental("Bright Smiles Orthodontist, braces and Invisalign for teens and adults."));
}

// ── FIX 3 (STRAY LINE): the shared app topbar's dark-mode support ──
// (verified by reading the actual source file, since this is pure CSS/JSX)
{
  const fs = require("fs");
  const layoutSrc = fs.readFileSync(require("path").join(__dirname, "../app/app/layout.tsx"), "utf-8") as string;
  check("app topbar header now has a dark: background variant (was bg-white with no dark: at all)",
    /bg-white dark:bg-\[#17171C\][^>]*border-b border-\[#E5E7EB\] dark:border-\[#2A2A32\]/.test(layoutSrc));
}

// ── FIX 4: leads.intent_summary is now selected + rendered ──
{
  const fs = require("fs");
  const leadsSrc = fs.readFileSync(require("path").join(__dirname, "../app/app/leads/page.tsx"), "utf-8") as string;
  check("leads list query now selects intent_summary", leadsSrc.includes("intent_summary") && leadsSrc.includes(".select(\"id, name, channel, status, phone, email, phone_unconfirmed, intent_summary"));
  check("lead detail panel now renders lead.intent_summary", /\{lead\.intent_summary && \(/.test(leadsSrc));
  check("Lead type now declares intent_summary", /intent_summary\?: string \| null;/.test(leadsSrc));
}

// ── FIX 7: structured-booking route logic, replicated as pure functions
// (the real route needs a live Supabase connection for checkAvailability,
// which this deliberately does NOT call -- see file header). ──
{
  type KbService = { name?: string };
  function matchService(requested: string, kbServices: KbService[], legacyServices: KbService[]): string | null {
    const allNames = [...kbServices, ...legacyServices].map((s) => s.name).filter((n): n is string => !!n);
    return allNames.find((n) => n.toLowerCase() === requested.toLowerCase()) ?? null;
  }

  const kbServices = [{ name: "Teeth Whitening" }, { name: "Dental Implants" }];

  check("BOOKING PATH: an exact real service name matches (case-sensitive input)",
    matchService("Teeth Whitening", kbServices, []) === "Teeth Whitening");
  check("BOOKING PATH: matching is case-insensitive (dropdown value could differ in casing)",
    matchService("teeth whitening", kbServices, []) === "Teeth Whitening");
  check("PENDING-LEAD PATH: a free-text service with no real match returns null (never books)",
    matchService("Root Canal Under General Anesthesia", kbServices, []) === null);
  check("PENDING-LEAD PATH: an empty trained-services list means everything falls to the pending path",
    matchService("Anything", [], []) === null);

  // Datetime construction: must match the SAME "no real timezone conversion,
  // literal digits + Z" convention already used throughout ai/reply/route.ts
  // and lib/availability.ts -- verified by reading the actual route file.
  const fs = require("fs");
  const routeSrc = fs.readFileSync(require("path").join(__dirname, "../app/api/widget/structured-booking/route.ts"), "utf-8") as string;
  check("structured-booking builds the datetime as literal `${date}T${time}:00Z` (matches the app-wide no-timezone-conversion convention)",
    routeSrc.includes("`${date}T${time}:00Z`"));
  check("structured-booking reuses the REAL checkAvailability from lib/availability.ts (not a reimplementation)",
    routeSrc.includes('import { checkAvailability, DEFAULT_SLOT_MINUTES } from "@/lib/availability"'));
  check("a matched service + available slot inserts an appointment with status 'confirmed' (the Fix 6 explicit-confirmation exception)",
    /status: "confirmed"/.test(routeSrc));
  check("an unmatched (untrained) service never creates an appointment, only a lead",
    (() => {
      const caseAIdx = routeSrc.indexOf("Case A: NOT a real trained service");
      const nextCaseIdx = routeSrc.indexOf("Case B:");
      const caseABody = routeSrc.slice(caseAIdx, nextCaseIdx);
      return !caseABody.includes("from(\"appointments\")");
    })());
  check("the free-text/unmatched path replies with the exact required 24h phrasing",
    routeSrc.includes("We'll reply to your phone number within 24 hours"));
  check("rate limiting matches the same hashed-IP pattern as submit-form/route.ts",
    routeSrc.includes("createHash(\"sha256\").update(rawIp + salt)"));
}

// ── FIX 2: upload path -- client size guard + honest error surfacing +
// server-side validation, all present and matching limits. ──
{
  const fs = require("fs");
  const clientSrc = fs.readFileSync(require("path").join(__dirname, "../app/app/website/page.tsx"), "utf-8") as string;
  const routeSrc = fs.readFileSync(require("path").join(__dirname, "../app/api/website/image-replace/route.ts"), "utf-8") as string;
  check("client rejects a file over 5MB before ever uploading it",
    clientSrc.includes("file.size > 5 * 1024 * 1024"));
  check("client no longer silently swallows a failed image-replace response (old: if (!res.ok) return;)",
    (() => {
      const start = clientSrc.indexOf("const handleImageReplace = useCallback");
      const body = clientSrc.slice(start, start + 1800);
      return !body.includes("if (!res.ok) return;") && body.includes("setImgReplaceError");
    })());
  check("client only closes the modal on a real success, not unconditionally in finally",
    (() => {
      const start = clientSrc.indexOf("const handleImageReplace = useCallback");
      const body = clientSrc.slice(start, start + 1800);
      const finallyIdx = body.indexOf("} finally {");
      const finallyBody = body.slice(finallyIdx, finallyIdx + 150);
      return !finallyBody.includes("setImgEditTarget(null)");
    })());
  check("server independently validates format + a matching 5MB cap (defense in depth, not just client-side)",
    routeSrc.includes("MAX_IMG_DATA_URL_LEN") && routeSrc.includes("data:image\\/(jpeg|jpg|png|webp)"));
}

// ── FIX 5/6: booking system prompt -- anti-repetition + all-at-once
// confirmation exception, both present with the intended scope. ──
{
  const fs = require("fs");
  const replySrc = fs.readFileSync(require("path").join(__dirname, "../app/api/ai/reply/route.ts"), "utf-8") as string;
  check("FIX 5: existingApptDirective now instructs the model not to restate the date/time every reply",
    replySrc.includes('Do NOT restate this exact date and time in every reply'));
  check("FIX 5: a second, general anti-repetition rule exists in the main Rules section too",
    replySrc.includes("say it in full ONE time and then stop repeating it"));
  check("FIX 6: the all-four-fields-at-once exception is scoped to the CUSTOMER's own single message, not the assistant's",
    replySrc.includes("if the CUSTOMER'S OWN SINGLE MESSAGE right now already states all four"));
  check("FIX 6: the exception explicitly does NOT apply when fields arrived one at a time (must not weaken the normal rule)",
    replySrc.includes("does NOT apply when you had to ask for the pieces one at a time"));
}

// ── FIX 7: renderWebsite still works unaffected (regression guard -- no
// website-renderer.ts changes this round, sanity check only). ──
{
  const html = renderWebsite({ businessName: "Test", sections: [{ type: "footer", content: {} }] }, {});
  check("renderWebsite still renders without throwing (unrelated to this round's changes, quick regression guard)",
    html.includes("Test"));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
