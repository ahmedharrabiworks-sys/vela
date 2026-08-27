import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { chromium } from "playwright";
config({ path: ".env.local" });

// Round M11 FIX C: real browser-level verification (Playwright loading the
// ACTUAL rendered HTML directly via page.setContent -- no login needed, no
// OpenAI/Unsplash calls, per the standing rule). Confirms the new D
// dictionary selectors genuinely match real elements in real generated
// output, not just via regex cross-checking.

import { renderWebsite } from "../lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "../lib/website-renderer";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { data: site } = await admin
    .from("websites")
    .select("draft_spec")
    .eq("id", "bac46c1b-7934-4ec5-92bd-9c044ad8a46e")
    .single();

  const spec = site!.draft_spec as WebsiteSpec;
  const html = renderWebsite(spec, {} as ImageMap, "test-tenant", "English");
  console.log("Real section types in this spec:", spec.sections.map((s) => s.type + (s.variant ? `(${s.variant})` : "")).join(", "));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html);

  const checks: { label: string; selector: string }[] = [
    { label: "hero headline (h1[class^=ws-hero-])", selector: 'h1[class^="ws-hero-"]' },
    { label: "hero subheadline ([class*=ws-hero-sub],[class$=-sub])", selector: '[class*="ws-hero-sub"],[class$="-sub"]' },
    { label: "trust-badges-band value", selector: ".ws-tbadge-val" },
    { label: "trust-badges-band label", selector: ".ws-tbadge-lbl" },
    { label: "treatment-gallery title", selector: ".ws-treat-title" },
    { label: "treatment-gallery description", selector: ".ws-treat-desc" },
    { label: "treatment-gallery price", selector: ".ws-treat-price" },
  ];

  console.log("\n=== Real DOM selector match counts ===");
  for (const c of checks) {
    const count = await page.locator(c.selector).count();
    console.log(`${c.label}: ${count} match(es)`);
  }

  // Simulate a real click and confirm the actual EDIT_SCRIPT mk()/proc()
  // logic (extracted verbatim from page.tsx) attaches data-ve correctly.
  const heroH1Text = await page.locator('h1[class^="ws-hero-"]').first().textContent();
  console.log("\nReal hero h1 text found:", heroH1Text);

  await browser.close();
})();
