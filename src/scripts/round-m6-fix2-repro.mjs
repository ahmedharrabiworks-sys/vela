import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { readFileSync } from "fs";
config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data: users } = await admin.auth.admin.listUsers();
const testUser = users.users.find(u => u.email === process.env.TEST_ACCOUNT_EMAIL);
const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", testUser.id).maybeSingle();
const { data: site } = await admin.from("websites").select("id").eq("tenant_id", tenant.id).limit(1).maybeSingle();

console.log("tenant:", tenant.id, "site:", site.id);

// Minimal real spec + real draft_html rendered via the ACTUAL renderWebsite
// code (no OpenAI/Unsplash call -- direct function call, fixed placeholder
// image URLs) so the real authenticated route has real data to operate on.
const spec = {
  businessName: "Smile Bright Dental Clinic",
  stylePreset: "medical",
  sections: [
    { type: "hero", imageQuery: "dental clinic reception", content: { headline: "Welcome" } },
    { type: "footer", content: {} },
  ],
};

// dynamic import of the real renderer (TS via tsx-compatible node loader not
// available in plain .mjs, so we hand-build a minimal valid draft_html with
// the exact data-vs marker + img tag shape the real renderer produces --
// sufficient to exercise the route's own extractImageMap/imgKey logic,
// which is the only thing under test here).
const draftHtml = `<!doctype html><html lang="en"><body>
<section data-vs="0" id="hero"><img src="https://images.unsplash.com/photo-000" alt="hero"></section>
<footer data-vs="1"></footer>
</body></html>`;

await admin.from("websites").update({ draft_spec: spec, draft_html: draftHtml, updated_at: new Date().toISOString() }).eq("id", site.id);
console.log("Seeded draft_spec + draft_html on the real test site (no AI call). [Re-run post-fix]");

// Load the real Playwright auth session cookies to make an authenticated
// request to the REAL production route -- this specific call path
// (imageData, not query) makes ZERO OpenAI/Unsplash calls.
const authState = JSON.parse(readFileSync("e2e/.auth/user.json", "utf-8"));
const origin = "https://vela-g8h4.vercel.app";
const cookieHeader = authState.cookies
  .filter(c => c.domain.includes("vela-g8h4.vercel.app") || c.domain === ".vela-g8h4.vercel.app")
  .map(c => `${c.name}=${c.value}`)
  .join("; ");

console.log("\nCookie header length:", cookieHeader.length, "| cookie names:", authState.cookies.map(c => c.name).join(", "));

const tinyJpegDataUri = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=";

const res = await fetch(`${origin}/api/website/image-replace`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "Cookie": cookieHeader },
  body: JSON.stringify({ websiteId: site.id, vs: "0", imgIdx: 0, imageData: tinyJpegDataUri }),
});

const text = await res.text();
console.log("\n=== REAL production response ===");
console.log("status:", res.status);
console.log("content-type:", res.headers.get("content-type"));
console.log("body (first 2000 chars):\n", text.slice(0, 2000));
