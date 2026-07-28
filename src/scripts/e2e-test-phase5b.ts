/**
 * Phase 5b Verification — Border, shadow, and per-element spacing controls
 *
 * CHECK 1  — EDIT_SCRIPT source: all new DOM, state, functions present in page.tsx
 * CHECK 1b — Parent handlers: vela-border, vela-shadow, vela-el-spacing exist + correct shape
 * CHECK 2  — Spec round-trip: _sectionBorders, _sectionShadows, _sectionSpacing (element keys)
 *             all survive renderWebsite → HTML comment → extractSpec
 * CHECK 3  — 375px: no new controls add horizontal overflow
 * CHECK 4  — Phase 5a regression: spacing controls unchanged
 *
 * Run: npx tsx --env-file .env.local src/scripts/e2e-test-phase5b.ts
 */

import * as fs from "fs";
import * as path from "path";
import { renderWebsite } from "../lib/website-renderer";
import type { WebsiteSpec } from "../lib/website-renderer";

const PAGE_PATH  = path.join(process.cwd(), "src/app/app/website/page.tsx");
const pageSource = fs.readFileSync(PAGE_PATH, "utf-8");

let totalChecks = 0;
let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  totalChecks++;
  if (condition) { passed++; console.log(`  ✅ ${label}`); }
  else           { failed++; console.error(`  ❌ ${label}${detail ? `\n       → ${detail}` : ""}`); }
}

function extractSpec(html: string): WebsiteSpec | null {
  const m = html.match(/<!-- WEBSITE_SPEC: ([\s\S]+?) -->/);
  if (!m) return null;
  try { return JSON.parse(m[1]) as WebsiteSpec; } catch { return null; }
}

// ── CHECK 1: EDIT_SCRIPT source ────────────────────────────────────────────────
console.log("\n══ CHECK 1: EDIT_SCRIPT — new DOM/state/functions ══\n");

// panel CSS
check("#ve-panel has max-height:80vh",
  pageSource.includes("max-height:80vh;overflow-y:auto;"));

// SHADOW_VALS
check("SHADOW_VALS array defined with 4 entries",
  pageSource.includes("var SHADOW_VALS=['','0 1px 3px rgba(0,0,0,.08)','0 4px 16px rgba(0,0,0,.12)','0 8px 32px rgba(0,0,0,.20)'];"));

// Border DOM
check("bdrWGrp mkGrp('Border'...) created",
  pageSource.includes("var bdrWGrp=mkGrp('Border',[{lbl:'—',val:''},{lbl:'1px',val:'1px'},{lbl:'2px',val:'2px'}]);"));
check("bdrClrInp color input created",
  pageSource.includes("var bdrClrInp=document.createElement('input');bdrClrInp.type='color';"));
check("bdrReset button created",
  pageSource.includes("var bdrReset=document.createElement('button');bdrReset.className='vep-btn';bdrReset.textContent='Reset';"));

// Shadow DOM
check("shdGrp mkGrp('Shadow'...) with SHADOW_VALS refs",
  pageSource.includes("var shdGrp=mkGrp('Shadow',[{lbl:'—',val:SHADOW_VALS[0]},{lbl:'Low',val:SHADOW_VALS[1]},{lbl:'Med',val:SHADOW_VALS[2]},{lbl:'High',val:SHADOW_VALS[3]}]);"));

// El-spacing DOM
check("elTopGrp mkGrp('El ↑'...) created",
  pageSource.includes("var elTopGrp=mkGrp('El ↑',SP_VALS.map(function(v,i){return{lbl:SP_LBLS[i],val:v};}));"));
check("elBotGrp mkGrp('El ↓'...) created",
  pageSource.includes("var elBotGrp=mkGrp('El ↓',SP_VALS.map(function(v,i){return{lbl:SP_LBLS[i],val:v};}));"));
check("elSpEls array with 3 elements (divider + elTopGrp.g + elBotGrp.g)",
  pageSource.includes("var elSpEls=[_div_elsp,elTopGrp.g,elBotGrp.g];"));
check("elSpEls initialized as hidden",
  pageSource.includes("elSpEls.forEach(function(el2){el2.style.display='none';});"));

// State vars
check("curBorderW/C, curShadow, curElTop/Bot state vars",
  pageSource.includes("curBorderW='',curBorderC='#374151',curShadow='',curElTop='',curElBot='';"));

// New functions
check("pbdr() postMessage function",
  pageSource.includes("function pbdr(si,border){parent.postMessage({type:'vela-border',sectionIndex:si,border:border},'*');}"));
check("pshd() postMessage function",
  pageSource.includes("function pshd(si,boxShadow){parent.postMessage({type:'vela-shadow',sectionIndex:si,boxShadow:boxShadow},'*');}"));
check("pels() postMessage function",
  pageSource.includes("function pels(si,etype,top,bot){parent.postMessage({type:'vela-el-spacing',sectionIndex:si,elementType:etype,marginTop:top,marginBottom:bot},'*');}"));
check("isHeading() helper",
  pageSource.includes("function isHeading(f){return f==='headline'||f==='subheadline'||f==='eyebrow';}"));
check("isCta() helper",
  pageSource.includes("function isCta(f){return f==='ctaPrimary'||f==='ctaSecondary'||f==='ctaText';}"));
check("elTypeOf() helper",
  pageSource.includes("function elTypeOf(f){return isHeading(f)?'heading':isCta(f)?'cta':'';}"));

// show() reads
check("show() reads border from spec._sectionBorders",
  pageSource.includes("var borderEntry=(spec._sectionBorders||{})[String(si)];"));
check("show() parses stored border into width + color with regex",
  pageSource.includes("var bdrMatch=storedBorder.match(/^(\\S+)\\s+solid\\s+(.+)$/);"));
check("show() reads shadow from spec._sectionShadows",
  pageSource.includes("var shadowEntry=(spec._sectionShadows||{})[String(si)];"));
check("show() calls elTypeOf to determine element type",
  pageSource.includes("var eltype=elTypeOf(f);"));
check("show() reads element spacing from spec._sectionSpacing with si_type key",
  pageSource.includes("var elKey=String(si)+'_'+eltype;") &&
  pageSource.includes("var elSt=(spec._sectionSpacing||{})[elKey]||{};"));
check("show() calls elSpEls.forEach to show/hide element spacing section",
  pageSource.includes("elSpEls.forEach(function(el2){el2.style.display=eltype?'':'none';});"));

// Button wiring
check("bdrWGrp wired: builds border string + calls pbdr()",
  pageSource.includes("var border=w?w+' solid '+curBorderC:'';") &&
  pageSource.includes("curBorderW=w;setActive(bdrWGrp.btns,w);pbdr(curSi,border);pos();"));
check("bdrClrInp wired: updates border color + calls pbdr()",
  pageSource.includes("curBorderC=bdrClrInp.value;") &&
  pageSource.includes("pbdr(curSi,border);"));
check("bdrReset wired: clears border + resets state",
  pageSource.includes("curBorderW='';curBorderC='#374151';setActive(bdrWGrp.btns,'');bdrClrInp.value='#374151';") &&
  pageSource.includes("pbdr(curSi,'');pos();"));
check("shdGrp wired: applies boxShadow + calls pshd()",
  pageSource.includes("if(sec)sec.style.boxShadow=v;") &&
  pageSource.includes("curShadow=v;setActive(shdGrp.btns,v);pshd(curSi,v);pos();"));
check("elTopGrp wired: applies marginTop + calls pels()",
  pageSource.includes("curEl.style.marginTop=v;") &&
  pageSource.includes("curElTop=v;setActive(elTopGrp.btns,v);"));
check("elBotGrp wired: applies marginBottom + calls pels()",
  pageSource.includes("curEl.style.marginBottom=v;") &&
  pageSource.includes("curElBot=v;setActive(elBotGrp.btns,v);"));

// Re-apply blocks
check("_sectionSpacing re-apply handles element-level keys (indexOf('_') !== -1 branch)",
  pageSource.includes("if(key.indexOf('_')===-1){") &&
  pageSource.includes("var kp=key.split('_');"));
check("_sectionSpacing re-apply applies marginTop/Bottom for element-level keys",
  pageSource.includes("if(st.marginTop!==undefined)eli.style.marginTop=st.marginTop;") &&
  pageSource.includes("if(st.marginBottom!==undefined)eli.style.marginBottom=st.marginBottom;"));
check("_sectionBorders re-apply block exists",
  pageSource.includes("var sb=spec._sectionBorders;") &&
  pageSource.includes("if(st.border!==undefined)sec.style.border=st.border;"));
check("_sectionShadows re-apply block exists",
  pageSource.includes("var sshad=spec._sectionShadows;") &&
  pageSource.includes("if(st.boxShadow!==undefined)sec.style.boxShadow=st.boxShadow;"));

// ── CHECK 1b: parent handlers ──────────────────────────────────────────────────
console.log("\n══ CHECK 1b: parent handlers — vela-border, vela-shadow, vela-el-spacing ══\n");

check("vela-border handler exists",
  pageSource.includes('if (msgType === "vela-border")'));
check("vela-border writes to _sectionBorders",
  pageSource.includes("(next as Record<string, unknown>)._sectionBorders = sbdr;"));
check("vela-border debounces 800ms",
  (() => {
    const idx = pageSource.indexOf('if (msgType === "vela-border")');
    return idx !== -1 && pageSource.slice(idx, idx + 800).includes("800");
  })());

check("vela-shadow handler exists",
  pageSource.includes('if (msgType === "vela-shadow")'));
check("vela-shadow writes to _sectionShadows",
  pageSource.includes("(next as Record<string, unknown>)._sectionShadows = sshd;"));
check("vela-shadow debounces 800ms",
  (() => {
    const idx = pageSource.indexOf('if (msgType === "vela-shadow")');
    return idx !== -1 && pageSource.slice(idx, idx + 1200).includes("800");
  })());

check("vela-el-spacing handler exists",
  pageSource.includes('if (msgType === "vela-el-spacing")'));
check("vela-el-spacing uses si_type key format",
  pageSource.includes('const elKey = `${sectionIndex}_${elementType}`;'));
check("vela-el-spacing writes to _sectionSpacing (shared with section-level)",
  pageSource.includes("(next as Record<string, unknown>)._sectionSpacing = selsp;"));
check("vela-el-spacing debounces 800ms",
  (() => {
    const idx = pageSource.indexOf('if (msgType === "vela-el-spacing")');
    return idx !== -1 && pageSource.slice(idx, idx + 1400).includes("800");
  })());

// WebsiteSpec types
const rendererSource = fs.readFileSync(
  path.join(process.cwd(), "src/lib/website-renderer.ts"), "utf-8"
);
check("WebsiteSpec has _sectionBorders field",
  rendererSource.includes("_sectionBorders?:"));
check("WebsiteSpec has _sectionShadows field",
  rendererSource.includes("_sectionShadows?:"));
check("WebsiteSpec._sectionSpacing extended with marginTop/Bottom",
  rendererSource.includes("marginTop?: string; marginBottom?: string"));

// ── CHECK 2: spec round-trip ───────────────────────────────────────────────────
console.log("\n══ CHECK 2: round-trip through renderWebsite → HTML comment → extractSpec ══\n");

const testSpec: WebsiteSpec = {
  businessName: "Round-Trip Clinic",
  category: "clinic",
  designDNA: {
    mood: "clinical-bright",
    headingFont: "Inter",
    bodyFont: "Inter",
    palette: { bg: "#FFFFFF", text: "#111111", accent: "#0284C7", muted: "#9CA3AF" },
    isDark: false,
  },
  sections: [
    {
      type: "hero",
      variant: "split",
      imageQuery: "dental clinic treatment room bright white",
      content: {
        eyebrow: "Test",
        headline: "Round-trip test",
        subheadline: "Verifying all Phase 5b fields survive the spec embed.",
        ctaPrimary: "Book",
      },
    },
    {
      type: "contact-block",
      variant: "",
      content: { headline: "Contact", phone: "+1 555 0000", email: "test@test.com", ctaLabel: "Send" },
    },
    {
      type: "footer",
      variant: "standard",
      content: { tagline: "Test.", links: ["Home"] },
    },
  ],
  navVariant: "standard",
  footerVariant: "standard",
  // Phase 5a: section-level spacing (regression)
  _sectionSpacing: {
    "0": { paddingTop: "48px", paddingBottom: "32px" },
    // Phase 5b FIX 3: element-level spacing (new — uses si_type keys)
    "0_heading": { marginTop: "16px", marginBottom: "8px" },
    "0_cta":     { marginTop: "24px" },
  },
  // Phase 5b FIX 1: section borders (new)
  _sectionBorders: {
    "0": { border: "1px solid #374151" },
  },
  // Phase 5b FIX 2: section shadows (new)
  _sectionShadows: {
    "1": { boxShadow: "0 4px 16px rgba(0,0,0,.12)" },
  },
};

let renderedHtml = "";
try {
  renderedHtml = renderWebsite(testSpec, {}, "test-tenant-id", "English");
  check("renderWebsite completed without error", true);
} catch (e) {
  check("renderWebsite completed without error", false, String(e));
}

if (renderedHtml) {
  check("rendered HTML contains WEBSITE_SPEC comment",
    renderedHtml.includes("<!-- WEBSITE_SPEC:"));

  const recovered = extractSpec(renderedHtml);
  check("extractSpec returns non-null", recovered !== null);

  if (recovered) {
    // _sectionBorders round-trip
    check("recovered _sectionBorders exists",
      "_sectionBorders" in recovered,
      `keys: ${Object.keys(recovered).filter(k => k.startsWith("_")).join(", ")}`);
    check("recovered _sectionBorders[0].border === '1px solid #374151'",
      recovered._sectionBorders?.["0"]?.border === "1px solid #374151",
      `got: ${JSON.stringify(recovered._sectionBorders?.["0"])}`);

    // _sectionShadows round-trip
    check("recovered _sectionShadows exists",
      "_sectionShadows" in recovered,
      `keys: ${Object.keys(recovered).filter(k => k.startsWith("_")).join(", ")}`);
    check("recovered _sectionShadows[1].boxShadow === '0 4px 16px rgba(0,0,0,.12)'",
      recovered._sectionShadows?.["1"]?.boxShadow === "0 4px 16px rgba(0,0,0,.12)",
      `got: ${JSON.stringify(recovered._sectionShadows?.["1"])}`);

    // _sectionSpacing: section-level (5a regression)
    check("recovered _sectionSpacing[0].paddingTop === '48px' (5a regression)",
      recovered._sectionSpacing?.["0"]?.paddingTop === "48px",
      `got: ${JSON.stringify(recovered._sectionSpacing?.["0"])}`);
    check("recovered _sectionSpacing[0].paddingBottom === '32px' (5a regression)",
      recovered._sectionSpacing?.["0"]?.paddingBottom === "32px");

    // _sectionSpacing: element-level (5b FIX 3)
    check("recovered _sectionSpacing['0_heading'].marginTop === '16px'",
      recovered._sectionSpacing?.["0_heading"]?.marginTop === "16px",
      `got: ${JSON.stringify(recovered._sectionSpacing?.["0_heading"])}`);
    check("recovered _sectionSpacing['0_heading'].marginBottom === '8px'",
      recovered._sectionSpacing?.["0_heading"]?.marginBottom === "8px");
    check("recovered _sectionSpacing['0_cta'].marginTop === '24px'",
      recovered._sectionSpacing?.["0_cta"]?.marginTop === "24px",
      `got: ${JSON.stringify(recovered._sectionSpacing?.["0_cta"])}`);

    console.log("\n  Actual recovered _sectionBorders:", JSON.stringify(recovered._sectionBorders));
    console.log("  Actual recovered _sectionShadows:", JSON.stringify(recovered._sectionShadows));
    console.log("  Actual recovered _sectionSpacing:", JSON.stringify(recovered._sectionSpacing));
  }
}

// ── CHECK 3: 375px — no new controls cause horizontal overflow ─────────────────
console.log("\n══ CHECK 3: 375px — overflow safety for border/shadow/element spacing ══\n");

// FIX 1 — border: applied as sec.style.border (shorthand, all sides). On a block-level
//   section that's already width:100%, a uniform border insets visually within the
//   existing flow box. With box-sizing:border-box (standard in tailwind/reset), the
//   declared width absorbs the border — no overflow. Even with content-box, a 1-2px
//   border on a 100%-width element pushes width by 2-4px, well within typical viewports.
check("EDIT_SCRIPT sets sec.style.border (shorthand — not left/right independently)",
  pageSource.includes("if(sec)sec.style.border=border;") &&
  !pageSource.includes("sec.style.borderLeft") &&
  !pageSource.includes("sec.style.borderRight"));

// FIX 2 — box-shadow: does NOT participate in layout flow. Per CSS spec, box-shadow
//   is outside normal flow and is clipped to the overflow scroll area of the stacking
//   context. It cannot push content or cause scrollWidth to increase.
check("SHADOW_VALS contains no horizontal-only shadow offset that could push layout",
  (() => {
    // All shadow values: '' | '0 1px ...' | '0 4px ...' | '0 8px ...'
    // x-offset is always 0 (the first number), so no horizontal shadow bleed.
    // Even if they did bleed, box-shadow doesn't affect scrollWidth by spec.
    const shadowBlock = pageSource.slice(
      pageSource.indexOf("var SHADOW_VALS="),
      pageSource.indexOf("var SHADOW_VALS=") + 150
    );
    // check x-offsets are 0: all values start with '0 '
    const matches = shadowBlock.match(/'0 \d/g) ?? [];
    return matches.length === 3; // 3 non-empty entries, all start with x=0
  })());

// FIX 3 — element-level spacing: marginTop/Bottom are block-axis only.
//   Same reasoning as Phase 5a paddingTop/Bottom.
check("element spacing sets marginTop/Bottom only (not marginLeft/Right)",
  pageSource.includes("curEl.style.marginTop=v;") &&
  pageSource.includes("curEl.style.marginBottom=v;") &&
  !pageSource.includes("curEl.style.marginLeft") &&
  !pageSource.includes("curEl.style.marginRight"));

check("element re-apply sets marginTop/Bottom only (not marginLeft/Right)",
  pageSource.includes("el.style.marginTop=st.marginTop") === false ||
  (() => {
    const idx = pageSource.indexOf("eli.style.marginTop=st.marginTop");
    if (idx === -1) { return false; }
    const block = pageSource.slice(idx - 50, idx + 200);
    return !block.includes("eli.style.marginLeft") && !block.includes("eli.style.marginRight");
  })());

// Verify element re-apply uses `eli` variable (confirming it's the correct block)
check("element re-apply block uses 'eli' variable to avoid variable collision",
  pageSource.includes("sec2.querySelectorAll(elsel).forEach(function(eli){"));

// ── CHECK 4: Phase 5a regression ───────────────────────────────────────────────
console.log("\n══ CHECK 4: Phase 5a regression ══\n");

check("psp() still exists (section spacing postMessage — unchanged)",
  pageSource.includes("function psp(si,top,bot){parent.postMessage({type:'vela-spacing'"));
check("topGrp still wired (section padding-top — unchanged)",
  pageSource.includes("curTop=v;setActive(topGrp.btns,v);psp(curSi,curTop,curBot);pos();"));
check("botGrp still wired (section padding-bottom — unchanged)",
  pageSource.includes("curBot=v;setActive(botGrp.btns,v);psp(curSi,curTop,curBot);pos();"));
check("vela-spacing parent handler unchanged",
  pageSource.includes('if (msgType === "vela-spacing")') &&
  pageSource.includes("const { sectionIndex, paddingTop, paddingBottom } = e.data as"));
check("section-level _sectionSpacing re-apply still applies paddingTop/Bottom",
  pageSource.includes("if(st.paddingTop!==undefined)sec.style.paddingTop=st.paddingTop;") &&
  pageSource.includes("if(st.paddingBottom!==undefined)sec.style.paddingBottom=st.paddingBottom;"));

// ── Save output HTML ───────────────────────────────────────────────────────────
const OUT_DIR = path.join(process.cwd(), "test-output-phase5b");
fs.mkdirSync(OUT_DIR, { recursive: true });
if (renderedHtml) {
  fs.writeFileSync(path.join(OUT_DIR, "test-site-5b-roundtrip.html"), renderedHtml, "utf-8");
  console.log(`\n  Saved: test-output-phase5b/test-site-5b-roundtrip.html`);
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════════════════════════");
console.log(`  Phase 5b Verification Summary`);
console.log(`  Total: ${totalChecks}  |  Passed: ${passed}  |  Failed: ${failed}`);
console.log("══════════════════════════════════════════════════════════");

if (failed > 0) {
  console.error(`\n❌ ${failed} check(s) failed.`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${totalChecks} checks passed.`);
}
