import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { renderWebsite } from "../lib/website-renderer";
import type { WebsiteSpec, ImageMap } from "../lib/website-renderer";
config({ path: ".env.local" });

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL as string, process.env.SUPABASE_SERVICE_ROLE_KEY as string);

async function main() {
  const { data: users } = await admin.auth.admin.listUsers();
  const testUser = users.users.find((u) => u.email === process.env.TEST_ACCOUNT_EMAIL);
  if (!testUser) throw new Error("test user not found");
  const { data: tenant } = await admin.from("tenants").select("id").eq("owner_id", testUser.id).maybeSingle();
  const { data: site } = await admin.from("websites").select("id").eq("tenant_id", tenant.id).limit(1).maybeSingle();

  const spec: WebsiteSpec = {
    businessName: "Smile Bright Dental Clinic",
    stylePreset: "medical",
    designDNA: {
      mood: "clinical-bright",
      headingFont: "Inter",
      bodyFont: "Inter",
      palette: { bg: "#FFFFFF", text: "#1E3A5F", accent: "#2563EB", muted: "#64748B" },
      isDark: false,
    },
    sections: [
      { type: "hero", imageQuery: "dental clinic reception", content: { headline: "Comprehensive Dental Care", subheadline: "Modern dentistry for the whole family.", ctaPrimary: "Book Now" } },
      { type: "about", imageQuery: "dentist office interior", content: { headline: "About Us", body: "We have served this community for over 15 years." } },
      {
        type: "feature-showcase",
        imageQueries: ["dental checkup room", "teeth whitening treatment", "dental implant procedure"],
        content: {
          headline: "Our Services",
          items: [
            { title: "General Checkups", description: "Routine exams." },
            { title: "Teeth Whitening", description: "Professional whitening." },
            { title: "Dental Implants", description: "Permanent replacement." },
          ],
        },
      },
      { type: "testimonials", content: { headline: "What Patients Say", items: [{ quote: "Best dental experience I've had.", name: "Sara K.", role: "Patient" }] } },
      { type: "faq", content: { headline: "FAQ", items: [{ q: "Do you accept insurance?", a: "Yes, most major providers." }] } },
      { type: "footer", content: {} },
    ],
  };

  // Real, publicly resolvable placeholder images (not fake Unsplash paths)
  // so onerror never fires and the click-to-open-picker flow can be tested
  // against a genuinely loaded, visible <img> -- matching real usage.
  const imageMap: ImageMap = {
    "0": "https://picsum.photos/seed/hero/1200/700",
    "1": "https://picsum.photos/seed/about/1200/700",
    "2_0": "https://picsum.photos/seed/checkup/600/600",
    "2_1": "https://picsum.photos/seed/whitening/600/600",
    "2_2": "https://picsum.photos/seed/implant/600/600",
  };

  const draftHtml = renderWebsite(spec, imageMap, tenant.id as string);
  console.log("Rendered real HTML, length:", draftHtml.length);
  console.log("has data-ve-f attrs:", draftHtml.includes("data-ve-f"));
  console.log("has data-vs attrs:", draftHtml.includes("data-vs="));

  await admin.from("websites").update({ draft_spec: spec, draft_html: draftHtml, updated_at: new Date().toISOString() }).eq("id", site.id);
  console.log("Seeded a REAL renderWebsite()-produced site on", site.id);
}

main();
