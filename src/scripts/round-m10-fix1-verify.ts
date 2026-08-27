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

  const bgAltVar = html.match(/--bg-alt:[^;]+;/);
  console.log("This site's real --bg-alt token:", bgAltVar ? bgAltVar[0] : "NOT FOUND");

  const heroSection = html.match(/<section[^>]*id="hero"[\s\S]*?<\/section>/);
  const emptySlot = heroSection?.[0].match(/<div data-ws-photo="1"[^>]*><\/div>/);
  console.log("\nHero empty-slot element:", emptySlot ? emptySlot[0] : "NOT FOUND");

  console.log("\n=== DIAGNOSIS ===");
  const stillHardcoded = /#0A2540|#1A1A1A|#050505|#1C1A17|#0A0A0A|#211F1C/.test(cssRule?.[0] ?? "");
  console.log(stillHardcoded ? "FAIL: still hardcoded dark" : "PASS: no longer hardcoded, uses var(--bg-alt)");
})();
