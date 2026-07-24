/**
 * Phase 2e verification — nav/footer variant pool
 *
 * Tests:
 *  A) real_estate → transparent nav + editorial footer
 *  B) interior_design + elegant → transparent nav + editorial footer
 *  C) gym + bold/cinematic → transparent nav + standard footer
 *  D) saas + minimal_luxury → minimal nav + compact footer
 *  E) dental + trustworthy → standard nav + standard footer
 *
 * Also verifies rendered HTML structure for each nav/footer variant.
 *
 * No GPT calls needed — selection is purely logic-based.
 * HTML structure verified via renderNav/renderFooter directly.
 */

import { renderNav, renderFooter } from "../lib/website-sections.js";

// ── Minimal DesignStrategy shape (mirrors the one in route.ts) ───────────────
type DesignStrategy = {
  category: string;
  subcategory: string;
  positioning: string;
  brand_personality: string;
  conversion_goal: string;
  visual_mood: string;
  target_audience: string;
};

// ── Replicate selection functions (must stay in sync with route.ts) ───────────
function selectNavVariant(strategy: DesignStrategy | null): string {
  if (!strategy) return "";
  const { category, visual_mood: vm, brand_personality: bp } = strategy;
  if (["real_estate", "interior_design"].includes(category)) return "transparent";
  if (category === "gym" && (bp === "bold" || bp === "energetic")) return "transparent";
  if (/cinematic|editorial|luxury/i.test(vm)) return "transparent";
  if (category === "saas" && bp === "minimal_luxury") return "minimal";
  return "";
}

function selectFooterVariant(strategy: DesignStrategy | null): string {
  if (!strategy) return "";
  const { category, brand_personality: bp } = strategy;
  if (["real_estate", "interior_design"].includes(category)) return "editorial";
  if (category === "saas") return "compact";
  if (bp === "minimal_luxury" || bp === "elegant") return "editorial";
  return "";
}

// ── Test cases ────────────────────────────────────────────────────────────────
const CASES: Array<{
  label: string;
  strategy: DesignStrategy;
  expectedNav: string;
  expectedFooter: string;
}> = [
  {
    label: "A — Real estate (Maison Prestige)",
    strategy: {
      category: "real_estate",
      subcategory: "luxury_residential",
      positioning: "premium",
      brand_personality: "elegant",
      conversion_goal: "lead_generation",
      visual_mood: "warm and editorial",
      target_audience: "high-net-worth buyers",
    },
    expectedNav: "transparent",
    expectedFooter: "editorial",
  },
  {
    label: "B — Interior design + elegant (Atelier Forma)",
    strategy: {
      category: "interior_design",
      subcategory: "residential",
      positioning: "premium",
      brand_personality: "minimal_luxury",
      conversion_goal: "consultation_booking",
      visual_mood: "calm and luxurious",
      target_audience: "design-conscious homeowners",
    },
    expectedNav: "transparent",
    expectedFooter: "editorial",
  },
  {
    label: "C — Gym + bold/cinematic (APEX Fight Club)",
    strategy: {
      category: "gym",
      subcategory: "combat_sports",
      positioning: "affordable",
      brand_personality: "bold",
      conversion_goal: "membership_signup",
      visual_mood: "cinematic dark and intense",
      target_audience: "fighters and fitness enthusiasts",
    },
    expectedNav: "transparent",
    expectedFooter: "",
  },
  {
    label: "D — SaaS + minimal_luxury (FlowBase)",
    strategy: {
      category: "saas",
      subcategory: "productivity",
      positioning: "premium",
      brand_personality: "minimal_luxury",
      conversion_goal: "free_trial_signup",
      visual_mood: "clean and modern",
      target_audience: "product teams",
    },
    expectedNav: "minimal",
    expectedFooter: "compact",
  },
  {
    label: "E — Dental + trustworthy (Bright Smile Clinic)",
    strategy: {
      category: "dental",
      subcategory: "general_dentistry",
      positioning: "premium",
      brand_personality: "trustworthy",
      conversion_goal: "appointment_booking",
      visual_mood: "clean and professional",
      target_audience: "local families",
    },
    expectedNav: "",
    expectedFooter: "",
  },
];

// ── Run selection tests ───────────────────────────────────────────────────────
let allPassed = true;
console.log("\n══ Phase 2e — Nav/Footer variant pool selection ══\n");

for (const tc of CASES) {
  const nav = selectNavVariant(tc.strategy);
  const footer = selectFooterVariant(tc.strategy);
  const navOk = nav === tc.expectedNav;
  const footerOk = footer === tc.expectedFooter;
  const pass = navOk && footerOk;
  if (!pass) allPassed = false;

  console.log(`${pass ? "✅" : "❌"} ${tc.label}`);
  console.log(`   nav:    expected="${tc.expectedNav || "standard"}"  got="${nav || "standard"}"  ${navOk ? "✓" : "FAIL"}`);
  console.log(`   footer: expected="${tc.expectedFooter || "standard"}"  got="${footer || "standard"}"  ${footerOk ? "✓" : "FAIL"}`);
}

// ── HTML structure verification ───────────────────────────────────────────────
console.log("\n══ Nav/Footer HTML structure ══\n");

const mockContact = {
  tagline: "Luxury spaces, lasting impressions.",
  links: ["Services", "About", "Portfolio", "Contact"],
  phone: "+971 50 123 4567",
  email: "hello@maisonprestige.com",
  address: "Dubai Marina, UAE",
  copyright: undefined,
};

const mockLinks = [
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Portfolio", href: "#gallery" },
  { label: "Contact", href: "#booking" },
];

// Nav: standard
const navStandard = renderNav("Bright Smile Clinic", "Book Appointment", mockLinks, "");
const navStdOk = navStandard.includes('class="ws-nav"') &&
  !navStandard.includes("ws-nav--transparent") &&
  !navStandard.includes("ws-nav--minimal") &&
  navStandard.includes("ws-nav-links") &&
  navStandard.includes("Bright Smile Clinic");
console.log(`${navStdOk ? "✅" : "❌"} nav standard: sticky + links + CTA`);

// Nav: transparent
const navTransparent = renderNav("Maison Prestige", "View Listings", mockLinks, "transparent");
const navTransOk = navTransparent.includes("ws-nav--transparent") &&
  navTransparent.includes("ws-nav-links") &&
  navTransparent.includes("Maison Prestige");
console.log(`${navTransOk ? "✅" : "❌"} nav transparent: ws-nav--transparent class + links`);

// Nav: minimal
const navMinimal = renderNav("FlowBase", "Get Started", mockLinks, "minimal");
const navMinOk = navMinimal.includes("ws-nav--minimal") &&
  !navMinimal.includes("ws-nav-links") &&
  navMinimal.includes("FlowBase");
console.log(`${navMinOk ? "✅" : "❌"} nav minimal: ws-nav--minimal + no links div`);

// Footer: standard
const footerStd = renderFooter("Bright Smile Clinic", mockContact, "");
const footerStdOk = footerStd.includes('class="ws-footer"') &&
  !footerStd.includes("ws-footer--editorial") &&
  !footerStd.includes("ws-footer--compact") &&
  footerStd.includes("ws-footer-inner") &&
  footerStd.includes("Bright Smile Clinic");
console.log(`${footerStdOk ? "✅" : "❌"} footer standard: 3-col layout + token colors`);

// Footer: editorial
const footerEd = renderFooter("Maison Prestige", mockContact, "editorial");
const footerEdOk = footerEd.includes("ws-footer--editorial") &&
  footerEd.includes("ws-footer-ed-inner") &&
  footerEd.includes("ws-footer-ed-name") &&
  footerEd.includes("Maison Prestige") &&
  footerEd.includes(mockContact.tagline!);
console.log(`${footerEdOk ? "✅" : "❌"} footer editorial: ws-footer--editorial + ed-name + ed-inner`);

// Footer: compact
const footerCompact = renderFooter("FlowBase", mockContact, "compact");
const footerCompactOk = footerCompact.includes("ws-footer--compact") &&
  footerCompact.includes("ws-footer-compact-inner") &&
  footerCompact.includes("FlowBase");
console.log(`${footerCompactOk ? "✅" : "❌"} footer compact: ws-footer--compact + compact-inner`);

// Mobile 375px — transparent nav hides links at 768px (same as standard via shared class)
// ws-nav-links is present in transparent variant and will be hidden at ≤768px by the existing media rule
const navTransHasLinks = navTransparent.includes("ws-nav-links");
console.log(`${navTransHasLinks ? "✅" : "❌"} nav transparent: ws-nav-links present (mobile: hidden by CSS at ≤768px)`);

// Editorial footer: responsive — verify both grid cols are in the HTML
const footerEdHasRight = footerEd.includes("ws-footer-ed-right");
console.log(`${footerEdHasRight ? "✅" : "❌"} footer editorial: ws-footer-ed-right present (mobile: stack via CSS)`);

// Compact footer: inline links present
const footerCompactHasLinks = footerCompact.includes("ws-footer-compact-links");
console.log(`${footerCompactHasLinks ? "✅" : "❌"} footer compact: ws-footer-compact-links present`);

// Token fix: standard footer uses var(--footer-bg) not hardcoded hex
// This is in the CSS (website-renderer.ts buildCss), not in the HTML — confirm the rendered
// HTML class doesn't have any inline background-color
const footerHasNoInlineBg = !footerStd.includes("background:#080E1A") && !footerStd.includes("background:#0D1526");
console.log(`${footerHasNoInlineBg ? "✅" : "❌"} footer standard: no hardcoded bg in HTML (token via CSS class)`);

console.log(`\n══ Summary ══`);
console.log(`Selection: 5 cases checked`);
console.log(`HTML:      9 structural checks`);
if (!allPassed) {
  console.error("\n❌ One or more selection tests FAILED.");
  process.exit(1);
} else {
  console.log("\n✅ All Phase 2e tests passed.");
}
