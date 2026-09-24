// Round M3, direct-function verification for FIX 1 (noPhotoMode recency)
// and FIX 2 (edit-mode click handler / data-ve marker collision).
// FIX 1's logic is a verbatim copy of the real functions from generate/
// route.ts (internal, not exported -- route.ts can't be imported standalone,
// same TEST-01 reasoning as round-m2-verify-no-api.ts). FIX 2 imports the
// real renderWebsite() directly (no Next.js/OpenAI dependency). Zero
// OpenAI/Unsplash calls either way.
// Run: npx tsx src/scripts/round-m3-verify-no-api.ts
import { renderWebsite } from "../lib/website-renderer";

let pass = 0, fail = 0;
function check(label: string, cond: boolean) {
  console.log(`${cond ? "PASS" : "FAIL"}, ${label}`);
  if (cond) pass++; else fail++;
}

function extractNoPhotoOptOut(fullText: string): boolean {
  const t = fullText.toLowerCase();
  const affirmativeStockRequest = /\b(use|add|include|find|get|want|need)\b[^.!?\n]{0,25}\b(stock\s+photo|stock\s+imagery|professional\s+(stock\s+)?photograph)/;
  const negatedStockRequest = /\b(don'?t|do\s+not|no)\b[^.!?\n]{0,15}\b(use|want|need|include)\b[^.!?\n]{0,20}\b(stock\s+photo|stock\s+imagery|professional\s+photograph)/;
  if (affirmativeStockRequest.test(t) && !negatedStockRequest.test(t)) return false;
  const noPhotoOptOut = [
    /\bno\b[^.!?\n]{0,20}\b(photos?|images?|pictures?|stock\s+photo)/,
    /\bwithout\b[^.!?\n]{0,15}\b(photos?|images?|pictures?)/,
    /\bskip\b[^.!?\n]{0,15}\b(photos?|images?|the\s+photos?)/,
    /\b(don'?t|do\s+not)\s+(use|want|need|include)\b[^.!?\n]{0,20}\b(photos?|images?|pictures?|stock)/,
    /\btypography[- ]only\b/,
    /\bphoto[- ]?free\b/,
    /\btext[- ]only\b/,
    /\bno\s+stock\b/,
  ];
  return noPhotoOptOut.some((re) => re.test(t));
}

function extractPhotoOptIn(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(add|insert|include|attach|put|use|show|upload)\b[^.!?\n]{0,20}\b(a\s+|an\s+|one\s+)?(photo|image|picture|stock)/.test(t)
    || /\byes\b[^.!?\n]{0,20}\b(photo|image|picture)/.test(t);
}

function isShortAffirmativeReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 40) return false;
  return /\b(yes|yeah|yep|sure|ok|okay|go ahead|do it|please|you add|you do it|add one|add it)\b/.test(t)
    && !/\bno\s+(photos?|images?|pictures?)\b/.test(t);
}

function isShortNegativeReply(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length > 40) return false;
  return /\b(no|nope|nah|skip|skip it|none)\b/.test(t);
}

function resolveNoPhotoMode(
  priorChat: Array<{ role: string; content: string }>,
  currentMessage: string,
): boolean {
  const turns: { text: string; precedingAssistant: string }[] = [
    { text: currentMessage, precedingAssistant: [...priorChat].reverse().find((m) => m.role !== "user")?.content ?? "" },
  ];
  for (let i = priorChat.length - 1; i >= 0; i--) {
    if (priorChat[i].role !== "user") continue;
    const precedingAssistant = priorChat.slice(0, i).reverse().find((m) => m.role !== "user")?.content ?? "";
    turns.push({ text: priorChat[i].content, precedingAssistant });
  }
  for (const { text, precedingAssistant } of turns) {
    if (!text) continue;
    if (extractNoPhotoOptOut(text)) return true;
    if (extractPhotoOptIn(text)) return false;
    const precedingRaisedPhotos = /\b(photos?|images?|pictures?)\b/i.test(precedingAssistant);
    if (isShortAffirmativeReply(text) && precedingRaisedPhotos) return false;
    if (isShortNegativeReply(text) && precedingRaisedPhotos) return true;
  }
  return false;
}

// ── The exact live-reported bug: early opt-out, later explicit add-request ──
{
  const history = [
    { role: "ai", content: "What language should your site be in?" },
    { role: "user", content: "English" },
    { role: "ai", content: "Do you have any photos you would like to use, such as a logo, team photo, or storefront? If not, I'll use professional stock photography that matches your business, just let me know if you'd rather have a clean, photo-free design instead." },
    { role: "user", content: "No thanks, keep it photo-free for now." },
    { role: "ai", content: "Got it. Your website is ready!" },
  ];
  check("BUG (old behavior would fail this): after an earlier 'photo-free' opt-out, a later explicit 'add a photo to the hero' request now WINS and turns photos back on",
    resolveNoPhotoMode(history, "add a photo to the hero") === false);

  check("BUG (old behavior would fail this): the exact live-reported short reply 'no you add' also wins, because the preceding assistant turn raised photos",
    resolveNoPhotoMode([...history, { role: "ai", content: "Would you like to upload your own photo, or should I add a professional stock photo for you?" }], "no you add") === false);

  check("without ANY later signal, the earlier opt-out still correctly holds (no regression on the original fix)",
    resolveNoPhotoMode(history, "make the headline bigger") === true);
}

// ── Original "Gallery bug" this history-scoping was built to prevent must still not regress ──
{
  const history = [
    { role: "ai", content: "Do you have any photos, or should I use stock photography?" },
    { role: "user", content: "No photos please, keep it typography-only." },
  ];
  check("REGRESSION GUARD: a later message with NO photo mention at all ('add a gallery section') still respects the earlier opt-out",
    resolveNoPhotoMode(history, "add a gallery section") === true);
}

// ── Bare short replies must not be over-eager ──
{
  check("a short 'ok' with no preceding photo-related question contributes no false opt-in signal",
    resolveNoPhotoMode([{ role: "ai", content: "What's your business phone number?" }], "ok") === false);
  check("a bare 'no' with no preceding photo-related question contributes no false opt-out signal",
    resolveNoPhotoMode([{ role: "ai", content: "Would you like a booking form?" }], "no") === false);
}

// ── FIX 2: buildStyleReapplyScript must no longer stamp the SAME 'data-ve'
// marker EDIT_SCRIPT's own mk() uses to decide whether to attach its
// click-to-select handler. Calls the real renderWebsite() (website-renderer.ts,
// no OpenAI/Unsplash involved) with a spec carrying _textStyles so the reapply
// script actually gets emitted, then inspects the real generated <script> text. ──
{
  const spec = {
    businessName: "Test Co",
    stylePreset: "realestate" as const,
    sections: [
      { type: "hero" as const, variant: "centered-overlay", content: { headline: "Hello World" } },
      { type: "footer" as const, content: { tagline: "Test Co" } },
    ],
    _textStyles: { "0_headline": { color: "#ff0044" } },
  };
  const html = renderWebsite(spec, {});
  // Check exact functional call-syntax substrings (not a fixed-size slice,
  // and distinct from the prose in this test's own comments/the source's).
  check("reapply script's mk() no longer sets the shared 'data-ve' marker EDIT_SCRIPT's mk() gates its click handler on",
    !html.includes("setAttribute('data-ve','1')"));
  check("reapply script's mk() no longer checks hasAttribute('data-ve') for its own idempotency",
    !/function mk\(el,si,f\)\{\s*if\(el\.hasAttribute\('data-ve'\)\)return;/.test(html));
  check("reapply script now uses its own idempotency marker ('data-vsr'), so it doesn't collide with EDIT_SCRIPT's mk()",
    html.includes("hasAttribute('data-vsr')") && html.includes("setAttribute('data-vsr','1')"));
  check("reapply script still sets data-ve-si/data-ve-f (still needed so it can select the right element to restyle)",
    html.includes("setAttribute('data-ve-si'") && html.includes("setAttribute('data-ve-f'"));
}

// ── FIX 3: extractImageMap (save-edit/route.ts, image-replace/route.ts,
// generate/route.ts's extractExistingImageMap) must recognize EVERY
// image-bearing section type via data-vs boundaries + spec-driven
// single/multi detection, not a hardcoded type allowlist. Verbatim copy of
// the real logic (route files can't be imported standalone -- Next.js
// server runtime dependency, same TEST-01 reasoning). Zero API calls --
// this is pure string/regex extraction over hand-built HTML fixtures. ──
{
  function getImageQuery(s: { imageQuery?: string; content?: Record<string, unknown> }): string | null {
    if (typeof s.imageQuery === "string" && s.imageQuery.trim()) return s.imageQuery.trim();
    if (s.content && typeof s.content.imageQuery === "string" && (s.content.imageQuery as string).trim()) {
      return (s.content.imageQuery as string).trim();
    }
    return null;
  }
  function getImageQueries(s: { imageQueries?: string[]; content?: Record<string, unknown> }): string[] {
    if (Array.isArray(s.imageQueries) && s.imageQueries.length) return s.imageQueries;
    if (s.content && Array.isArray(s.content.imageQueries)) return s.content.imageQueries as string[];
    return [];
  }
  type Sec = { type: string; imageQuery?: string; imageQueries?: string[]; content?: Record<string, unknown> };
  function extractImageMap(spec: { sections: Sec[] }, html: string): Record<string, string> {
    const images: Record<string, string> = {};
    for (let i = 0; i < spec.sections.length; i++) {
      const s = spec.sections[i];
      const isMulti = getImageQueries(s).length > 0;
      const isSingle = !isMulti && !!getImageQuery(s);
      if (!isMulti && !isSingle) continue;
      const secStart = html.indexOf(`data-vs="${i}"`);
      if (secStart === -1) continue;
      const nextStart = html.indexOf(`data-vs="${i + 1}"`, secStart + 1);
      const slice = nextStart === -1 ? html.slice(secStart) : html.slice(secStart, nextStart);
      if (isMulti) {
        const imgRe = /<img[^>]+src="(https?:\/\/[^"]+|data:image\/[^"]+)"/g;
        let m: RegExpExecArray | null; let j = 0;
        while ((m = imgRe.exec(slice)) !== null) images[`${i}_${j++}`] = m[1];
      } else {
        const m = slice.match(/<img[^>]+src="(https?:\/\/[^"]+|data:image\/[^"]+)"/);
        if (m) images[String(i)] = m[1];
      }
    }
    return images;
  }

  // A NEWER section type ("trust-badges-band") that the OLD hardcoded
  // allowlist never recognized, sitting between a hero and a footer.
  const spec = {
    sections: [
      { type: "hero", imageQuery: "q1" },
      { type: "trust-badges-band", imageQuery: "q2" },
      { type: "gallery-grid", imageQueries: ["g1", "g2", "g3"] },
      { type: "footer" },
    ],
  };
  const html = `
    <section data-vs="0"><img src="https://images.unsplash.com/hero.jpg"></section>
    <section data-vs="1"><img src="https://images.unsplash.com/trust.jpg"></section>
    <section data-vs="2">
      <img src="https://images.unsplash.com/g1.jpg">
      <img src="data:image/jpeg;base64,ZmFrZQ==">
      <img src="https://images.unsplash.com/g3.jpg">
    </section>
    <section data-vs="3">no images here</section>
  `;
  const map = extractImageMap(spec, html);
  check("BUG (old allowlist would have dropped this): a newer, non-hero/about/gallery section type ('trust-badges-band') keeps its real image",
    map["1"] === "https://images.unsplash.com/trust.jpg");
  check("hero section (old allowlist already supported this) still works",
    map["0"] === "https://images.unsplash.com/hero.jpg");
  check("multi-image section still extracts all 3 images with i_j keys",
    map["2_0"] === "https://images.unsplash.com/g1.jpg" && map["2_2"] === "https://images.unsplash.com/g3.jpg");
  check("BUG (old https-only regex would have dropped this): an uploaded data:image/ photo is captured too",
    map["2_1"] === "data:image/jpeg;base64,ZmFrZQ==");
  check("a section with no imageQuery/imageQueries at all (footer) is correctly skipped, not mis-keyed",
    map["3"] === undefined);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
