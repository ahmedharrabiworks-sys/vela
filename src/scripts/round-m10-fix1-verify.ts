import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
config({ path: ".env.local" });

// Round M10 FIX 1: direct verification -- calls the REAL renderWebsite()
// function with a REAL production site's actual draft_spec (no OpenAI/
// Unsplash involved, pure deterministic template rendering, per the
// standing rule). Confirms the .ws-hero-split-media fix actually produces
// a theme-correct fallback instead of the hardcoded-mood-dark #0A2540.

import { renderWebsite } from "../lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "../lib/website-renderer";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { data: site } = await admin
    .from("websites")
    .select("draft_spec")
    .eq("id", "28cf86b3-8378-48ef-be42-ab54146873ab")
    .single();

  const spec = site!.draft_spec as WebsiteSpec;
  // Empty imageMap -- forces every slot (including the hero) to render its
  // empty-state fallback, exactly the scenario under test.
  const html = renderWebsite(spec, {} as ImageMap, "test-tenant", "English");

  const cssRule = html.match(/\.ws-hero-split-media\{[^}]*\}/);
  console.log("Fresh .ws-hero-split-media rule:", cssRule ? cssRule[0] : "NOT FOUND (site may not use the split hero variant)");

  const sectionRule = html.match(/\.ws-hero--split\{[^}]*\}/);
  console.log("The section's own rule:", sectionRule ? sectionRule[0] : "NOT FOUND");

  const bgVar = html.match(/(?<!-)--bg:[^;]+;/);
  const bgAltVar = html.match(/--bg-alt:[^;]+;/);
  console.log("This site's real --bg token:", bgVar ? bgVar[0] : "NOT FOUND");
  console.log("This site's real --bg-alt token:", bgAltVar ? bgAltVar[0] : "NOT FOUND");

  const heroSection = html.match(/<section[^>]*id="hero"[\s\S]*?<\/section>/);
  const emptySlot = heroSection?.[0].match(/<div data-ws-photo="1"[^>]*><\/div>/);
  console.log("\nHero empty-slot element:", emptySlot ? emptySlot[0] : "NOT FOUND");

  console.log("\n=== DIAGNOSIS ===");
  const usesExactBg = /background:var\(--bg\);/.test(cssRule?.[0] ?? "");
  const sectionUsesSameVar = (sectionRule?.[0] ?? "").includes(bgVar?.[0]?.match(/#[0-9A-Fa-f]{3,8}/)?.[0] ?? "___nomatch___");
  console.log(usesExactBg ? "PASS: media wrapper uses var(--bg) directly" : "FAIL: media wrapper does not use var(--bg)");
  console.log(sectionUsesSameVar ? "PASS: section's own background resolves to the exact same colour value" : "check manually -- could not confirm exact value match");
})();
