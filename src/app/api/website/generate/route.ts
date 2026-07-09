import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMG_B64 = Math.ceil(5 * 1024 * 1024 * (4 / 3));
const MAX_MSG_LEN = 5000;

const TYPE_QUERIES: Record<string, { hero: string; about: string; services: string }> = {
  dental:      { hero: "dental clinic modern interior", about: "dentist patient smiling", services: "dental tools clean white" },
  medical:     { hero: "modern medical clinic interior", about: "doctor patient consultation", services: "medical professional healthcare" },
  restaurant:  { hero: "restaurant interior elegant", about: "chef cooking kitchen", services: "gourmet food plated restaurant" },
  cafe:        { hero: "coffee shop cozy interior", about: "barista making coffee", services: "coffee latte art cafe" },
  gym:         { hero: "modern gym fitness center", about: "personal trainer workout", services: "gym equipment weights fitness" },
  spa:         { hero: "luxury spa interior calm", about: "spa massage relaxation", services: "spa beauty treatment wellness" },
  salon:       { hero: "luxury hair salon interior", about: "hair stylist client salon", services: "hair styling beauty salon" },
  law:         { hero: "modern law office interior", about: "lawyer professional office", services: "corporate meeting boardroom" },
  hotel:       { hero: "luxury hotel lobby interior", about: "hotel room elegant luxury", services: "hotel amenities swimming pool" },
  real_estate: { hero: "modern real estate office", about: "real estate agent property", services: "luxury home interior modern" },
  default:     { hero: "modern professional office interior", about: "team professionals working", services: "business meeting office" },
};

function detectBusinessType(industry: string, message: string): string {
  const text = `${industry} ${message}`.toLowerCase();
  if (/dental|dentist|teeth|orthodon/.test(text)) return "dental";
  if (/medical|clinic|doctor|health|hospital|physician|therapy|physio/.test(text)) return "medical";
  if (/restaurant|dining|bistro|brasserie|food|cuisine|eatery/.test(text)) return "restaurant";
  if (/café|cafe|coffee|bakery|pastry|brunch/.test(text)) return "cafe";
  if (/gym|fitness|sport|workout|training|crossfit|pilates|yoga/.test(text)) return "gym";
  if (/spa|massage|wellness|relax/.test(text)) return "spa";
  if (/salon|hair|beauty|nail|barber|stylist|lash|brow/.test(text)) return "salon";
  if (/law|legal|attorney|lawyer|firm|solicitor|barrister/.test(text)) return "law";
  if (/hotel|resort|hospitality|accommodation|inn|motel|airbnb/.test(text)) return "hotel";
  if (/real estate|property|realtor|estate agent|letting/.test(text)) return "real_estate";
  return "default";
}

async function fetchUnsplashPhoto(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) {
    console.warn("[unsplash] UNSPLASH_ACCESS_KEY is not set — skipping photo fetch");
    return null;
  }
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
    const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
    if (!res.ok) {
      console.warn(`[unsplash] API returned ${res.status} for query="${query}"`);
      return null;
    }
    const data = await res.json() as { results?: { urls?: { regular?: string } }[] };
    const results = data.results ?? [];
    if (!results.length) {
      console.warn(`[unsplash] No results for query="${query}"`);
      return null;
    }
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))];
    const photoUrl = pick?.urls?.regular ?? null;
    console.log(`[unsplash] query="${query}" → ${photoUrl ? photoUrl.slice(0, 80) + "…" : "null"}`);
    return photoUrl;
  } catch (err) {
    console.error("[unsplash] fetch error:", err instanceof Error ? err.message : err);
    return null;
  }
}

const BUILD_SYSTEM = `You are a world-class web designer. Generate a complete, minimal, premium booking website as a single self-contained HTML file. Target aesthetic: Linear, Framer templates, Lovable output — restrained, editorial, professional. Not loud or flashy.

OUTPUT RULE: Raw HTML only — no markdown, no code fences, no explanation. Start with <!DOCTYPE html> and end with </html>.

━━━ STEP 1: DETECT INDUSTRY → APPLY EXACT AESTHETIC ━━━

MEDICAL / DENTAL / CLINIC / HEALTHCARE:
  Colors: accent #0EA5E9, section-alt #F0F9FF, dark #1E293B, text-muted #64748B, white
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@400;700&display=swap')
  Heading: Merriweather, serif | Body: Inter, sans-serif
  CTA text: "Book Appointment" / "Schedule Consultation"

RESTAURANT / CAFÉ / FOOD / BAR:
  Colors: accent #B45309, dark #1C1917, warm-light #FEF3C7, text-muted #78716C, card #FFFBEB
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Lato:wght@300;400;700&display=swap')
  Heading: Playfair Display, serif | Body: Lato, sans-serif
  CTA text: "Reserve a Table" / "Order Now"

GYM / FITNESS / SPORTS / YOGA / CROSSFIT:
  Colors: accent #F59E0B, base #111827, mid #374151, light #F9FAFB
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&family=Inter:wght@400;500&display=swap')
  Heading: Montserrat 700/900 | Body: Inter
  CTA text: "Start Free Trial" / "Join Now"

SALON / BEAUTY / SPA / HAIR / NAILS:
  Colors: accent #B08D6E, cream #F9F5F0, text #2D2D2D, soft #E8D5C4, muted #9B8577
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Raleway:wght@300;400;500&display=swap')
  Heading: Cormorant Garamond, serif | Body: Raleway
  CTA text: "Book Treatment" / "Reserve Your Spot"

LAW / LEGAL / FINANCE / ACCOUNTING:
  Colors: navy #1E3A5F, gold #B8922A, off-white #F8F7F4, dark #1A1A2E, mid #4A5568
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;600&display=swap')
  Heading: Libre Baskerville, serif | Body: Source Sans 3
  CTA text: "Free Consultation" / "Contact Us"

HOTEL / HOSPITALITY / RESORT:
  Colors: forest #064E3B, gold #C9A84C, cream #FAF9F6, dark #1A1A1A
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap')
  Heading: Playfair Display | Body: Inter
  CTA text: "Book Your Stay" / "Reserve Now"

DEFAULT / OTHER:
  Colors: accent #2563EB, light #F8FAFC, dark #1E293B, muted #64748B
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap')
  Heading + Body: Inter
  CTA text: "Get Started" / "Book Now"

━━━ STEP 2: REQUIRED SECTIONS IN ORDER ━━━

1. NAV
   position:sticky; top:0; z-index:100; background:white; border-bottom:1px solid #E5E7EB
   Layout: max-width:1200px; margin:0 auto; padding:0 32px; height:64px; display:flex; align-items:center; justify-content:space-between
   Left: business name — font-weight:700; font-size:1.1rem; accent color; letter-spacing:-0.02em
   Center: nav links (Services, About, Testimonials, Contact) — gap:32px; font-size:0.875rem; color:#374151; no-underline; hover:accent
   Right: CTA button — background:accent; color:white; padding:9px 20px; border-radius:6px; font-size:0.875rem; font-weight:600
   Mobile: hide center links; keep logo + CTA button only

2. HERO — TWO-COLUMN EDITORIAL SPLIT (MANDATORY LAYOUT)
   Section: display:grid; grid-template-columns:1fr 1fr; min-height:80vh; overflow:hidden

   LEFT COLUMN — text side:
     background: industry-appropriate dark (navy, near-black, dark-green, or very dark version of accent)
     padding:80px 56px 80px 64px; display:flex; flex-direction:column; justify-content:center
     Eyebrow: font-size:0.7rem; font-weight:600; letter-spacing:0.12em; text-transform:uppercase; color:rgba(255,255,255,0.5); margin-bottom:20px
     Headline: font-size:clamp(2rem,3.5vw,3.2rem); font-weight:700; line-height:1.2; color:white; margin-bottom:16px; max-width:480px
     Sub: font-size:0.975rem; line-height:1.7; color:rgba(255,255,255,0.65); margin-bottom:36px; max-width:420px
     CTAs: display:flex; gap:12px; flex-wrap:wrap
       Primary: background:accent; color:white; padding:12px 28px; border-radius:6px; font-weight:600; font-size:0.9rem; cursor:pointer
       Secondary: border:1px solid rgba(255,255,255,0.25); color:white; same padding; border-radius:6px; background:transparent

   RIGHT COLUMN — photo side:
     style="position:relative; overflow:hidden; background:linear-gradient(135deg, [industry-dark-color-1], [industry-dark-color-2])"
     ALWAYS output this EXACT img tag inside the right column div — write the token verbatim, do NOT change it:
       <img src="{{HERO_IMAGE}}" alt="hero photo" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">
     The token {{HERO_IMAGE}} is replaced server-side with a real photo. Include the CSS gradient as a background fallback on the column div.

   MOBILE (@media (max-width:768px)):
     grid-template-columns:1fr (stack)
     Right col (image): height:280px; position:relative (img absolute inside still works)
     Left col: padding:52px 24px; order:-1 (text first on mobile)

3. SERVICES
   background:section-alt or #F9FAFB; padding:80px 32px
   max-width:1100px; margin:0 auto
   Section label (eyebrow): same style as hero eyebrow but in accent color, centered, margin-bottom:12px
   Heading: font-size:clamp(1.6rem,3vw,2.4rem); font-weight:700; text-align:center; color:dark; margin-bottom:8px
   Sub: font-size:0.925rem; color:muted; text-align:center; margin-bottom:48px
   Grid: display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px
   Card: background:white; border-radius:12px; padding:28px 24px; border:1px solid #E5E7EB; transition:box-shadow 0.2s,transform 0.2s
   Card hover: box-shadow:0 8px 32px rgba(0,0,0,0.1); transform:translateY(-4px)
   Icon circle: 44px; background:accent/10; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:18px; font-size:1.25rem
   Title: font-size:1.05rem; font-weight:600; color:dark; margin-bottom:6px
   Body: font-size:0.875rem; color:muted; line-height:1.6
   Price (if given): display:inline-block; margin-top:12px; font-size:0.875rem; font-weight:600; color:accent
   Use REAL services from the instruction if provided. Otherwise write 3 realistic ones for the industry with plausible prices.

4. ABOUT / WHY US
   background:white; padding:80px 32px
   Inner: max-width:1100px; margin:0 auto; display:flex; gap:64px; align-items:center
   ALWAYS output this EXACT img tag as the first child of the inner flex div — write the token verbatim, do NOT change it:
     <img src="{{ABOUT_IMAGE}}" alt="our team" style="width:100%;height:420px;object-fit:cover;border-radius:12px;display:block;flex-shrink:0;max-width:480px">
   The token {{ABOUT_IMAGE}} is replaced server-side with a real photo.
   Right side: flex:1; min-width:0
     Eyebrow label + heading (font-size:clamp(1.5rem,2.5vw,2.2rem); font-weight:700; margin-bottom:20px)
     3-4 feature rows: display:flex; gap:14px; margin-bottom:20px
       Check circle (28px; accent bg; ✓ white) + text column (title bold 0.9rem + desc 0.85rem muted)
     Write industry-specific, believable differentiators — never generic filler or Lorem ipsum.
   Mobile: flex-direction:column; image max-width:100%; height:260px

5. TESTIMONIALS
   background:section-alt or light tint; padding:80px 32px
   max-width:1100px; margin:0 auto
   Eyebrow + heading (centered)
   Grid: display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; margin-top:48px
   Card: background:white; border-radius:12px; padding:24px; border:1px solid #E5E7EB
   Stars: ★★★★★ color:#F59E0B; font-size:0.875rem; margin-bottom:12px
   Quote: font-size:0.9rem; line-height:1.65; color:#374151; font-style:italic; margin-bottom:20px
   Footer row: display:flex; align-items:center; gap:12px
     Avatar: 40px circle; background:accent; color:white; font-weight:600; font-size:0.8rem
     Name: font-weight:600; font-size:0.875rem | Label: font-size:0.75rem; color:muted
   Use realistic names from the business's city/region.

6. CTA STRIP
   background:accent (or dark for salon/law); padding:72px 32px; text-align:center
   Heading: font-size:clamp(1.5rem,3vw,2.2rem); font-weight:700; color:white; margin-bottom:12px
   Sub: font-size:0.975rem; color:rgba(255,255,255,0.75); margin-bottom:32px
   Button: background:white; color:accent (or dark); padding:14px 36px; border-radius:6px; font-weight:600; cursor:pointer

7. FOOTER
   background:#111827; color:#9CA3AF; padding:52px 32px 24px
   Inner: max-width:1100px; margin:0 auto
   Top: display:grid; grid-template-columns:2fr 1fr 1fr; gap:40px; margin-bottom:40px
   Col1: business name (white, 700) + tagline (muted) + social row (placeholder dots)
   Col2: "Quick Links" label + links list (Services, About, Privacy — hover white)
   Col3: "Contact" label + address/phone/email/hours (realistic placeholders per industry)
   Bottom: border-top:1px solid #1F2937; padding-top:20px; font-size:0.8rem; text-align:center
   Mobile: grid-template-columns:1fr

━━━ QUALITY STANDARDS ━━━
- @import inside <style> tag in <head>. NEVER use a <link> tag for fonts.
- <meta charset="UTF-8"> and <meta name="viewport" content="width=device-width,initial-scale=1">
- Type scale: headlines clamp(2rem,3.5vw,3.2rem) max | body 0.925rem–1rem | captions 0.8rem. NOTHING larger than 3.5rem.
- Spacing: 80px vertical section padding on desktop, 52px on mobile. Not more.
- Zero horizontal scroll at 375px. Mobile padding: 24px sides minimum.
- All img: always include style="display:block" — never inline-block or default
- Buttons: cursor:pointer; transition:all 0.2s; + :hover state. border-radius:6px (not 50px pills).
- Cards: border:1px solid #E5E7EB; border-radius:12px — no heavy box-shadows
- Write real, industry-specific copy throughout. Never "Lorem ipsum" or "My Business".`;

const REVISE_SYSTEM = `You are an expert web designer editing an existing website. Apply ONLY the change the user requested. Output the complete updated HTML — nothing else.

Rules:
- Raw HTML only — no markdown, no code fences, no explanation
- Apply the request precisely and literally: "make header blue" means change nav background to blue, nothing else
- Preserve ALL other content, styles, sections, and structure
- Never remove sections or content unless explicitly told to
- Maintain responsive design and all media queries`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    currentHtml?: string;
    history?: { role: string; content: string }[];
    images?: { data: string; mimeType: string }[];
  };

  const { message, currentHtml, history = [], images = [] } = body;

  if (!message?.trim() && images.length === 0) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (message && message.length > MAX_MSG_LEN) {
    return NextResponse.json({ error: "Message too long (max 5000 characters)" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Validate uploaded images server-side
  const validImages = images
    .slice(0, 4)
    .filter((img) =>
      img?.data &&
      img?.mimeType &&
      ALLOWED_IMG_TYPES.has(img.mimeType) &&
      img.data.length <= MAX_IMG_B64
    );

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin
    .from("tenants")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  const businessName = (tenant?.business_name as string) || "My Business";
  const industry = (tenant?.industry as string) || "";
  const city = (tenant?.city as string) || "";

  const isRevision = !!currentHtml;
  const msgText = message?.trim() ?? "";

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    let userContent: string;
    let systemPrompt: string;
    // Declared at outer scope so the post-processing block can access them
    let heroSrc: string | null = null;
    let aboutUrl: string | null = null;

    if (isRevision) {
      systemPrompt = REVISE_SYSTEM;

      const imageNote = validImages.length > 0
        ? `\n\nUser uploaded ${validImages.length} image(s) to incorporate. Embed the first one as a hero image or in the most appropriate section:\n<img src="data:${validImages[0].mimeType};base64,${validImages[0].data}" style="width:100%;height:100%;object-fit:cover;display:block" alt="Business photo">${validImages[1] ? `\nSecond image: <img src="data:${validImages[1].mimeType};base64,${validImages[1].data}" style="width:100%;object-fit:cover;display:block" alt="Photo">` : ""}`
        : "";

      userContent = `Current website HTML:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nChange requested: ${msgText || "incorporate the uploaded image(s) in the best spot"}${imageNote}`;
    } else {
      systemPrompt = BUILD_SYSTEM;

      // Detect type and fetch real photos in parallel
      const bizType = detectBusinessType(industry, msgText);
      const queries = TYPE_QUERIES[bizType] ?? TYPE_QUERIES.default;

      const [heroUrl, fetchedAboutUrl, servicesUrl] = await Promise.all([
        fetchUnsplashPhoto(queries.hero),
        fetchUnsplashPhoto(queries.about),
        fetchUnsplashPhoto(queries.services),
      ]);
      aboutUrl = fetchedAboutUrl;

      // User-uploaded image takes priority for hero
      heroSrc = validImages.length > 0
        ? `data:${validImages[0].mimeType};base64,${validImages[0].data}`
        : heroUrl;

      console.log(`[website/generate] heroSrc=${heroSrc ? "✓ " + (heroSrc.startsWith("data:") ? "user-upload" : heroSrc.slice(0, 60)) : "none"} aboutUrl=${aboutUrl ? "✓ " + aboutUrl.slice(0, 60) : "none"}`);

      // Tokens {{HERO_IMAGE}} and {{ABOUT_IMAGE}} are written by GPT-4o and replaced
      // server-side below — GPT-4o never sees the actual URLs.
      userContent = [
        `Business name: ${businessName}`,
        `Industry: ${industry || "service business"}`,
        `City: ${city || ""}`,
        `User instruction: ${msgText}`,
        ``,
        `Image tokens: use {{HERO_IMAGE}} and {{ABOUT_IMAGE}} exactly as instructed in the system prompt.`,
        `Both tokens will be replaced server-side — write them verbatim in the src attributes.`,
      ].join("\n");
    }

    // Build history for context (cap at last 4 messages to keep tokens reasonable)
    const historyMsgs: OpenAI.ChatCompletionMessageParam[] = history
      .filter((h) => h.role === "user" || h.role === "assistant")
      .slice(-4)
      .map((h) => ({ role: h.role as "user" | "assistant", content: h.content }));

    const msgs: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...historyMsgs,
      { role: "user", content: userContent },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: msgs,
      max_tokens: 4096,
      temperature: 0.4,
    });

    let html = completion.choices[0]?.message?.content ?? "";
    html = html.replace(/^```html\n?/i, "").replace(/^```\n?/, "").replace(/\n?```$/, "").trim();

    if (!html.includes("<!DOCTYPE") && !html.includes("<html")) {
      return NextResponse.json({ error: "Generation failed — please try again." }, { status: 500 });
    }

    // ── Deterministic token replacement ───────────────────────────────────────
    // GPT-4o writes {{HERO_IMAGE}} / {{ABOUT_IMAGE}} as placeholders.
    // We substitute the real URLs here, guaranteeing photos appear regardless
    // of whether GPT-4o would have used a URL correctly on its own.
    if (!isRevision) {
      // HERO_IMAGE
      if (heroSrc) {
        html = html.replaceAll("{{HERO_IMAGE}}", heroSrc);
        console.log(`[website/generate] replaced {{HERO_IMAGE}} → ${heroSrc.startsWith("data:") ? "user-upload data URI" : heroSrc.slice(0, 60)}`);
      } else {
        // No photo: remove any img tag with the stray token so the gradient shows
        html = html.replace(/<img\b[^>]*src=["']?\{\{HERO_IMAGE\}\}["']?[^>]*\/?>/gi, "");
        html = html.replaceAll("{{HERO_IMAGE}}", "");
        console.log("[website/generate] {{HERO_IMAGE}} not available — token removed");
      }

      // ABOUT_IMAGE
      if (aboutUrl) {
        html = html.replaceAll("{{ABOUT_IMAGE}}", aboutUrl);
        console.log(`[website/generate] replaced {{ABOUT_IMAGE}} → ${aboutUrl.slice(0, 60)}`);
      } else {
        // Replace with a neutral styled placeholder div
        const placeholderImg = `<div style="width:100%;max-width:480px;height:420px;flex-shrink:0;background:linear-gradient(135deg,#f1f5f9,#e2e8f0);border-radius:12px;display:flex;align-items:center;justify-content:center"><svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg></div>`;
        html = html.replace(/<img\b[^>]*src=["']?\{\{ABOUT_IMAGE\}\}["']?[^>]*\/?>/gi, placeholderImg);
        html = html.replaceAll("{{ABOUT_IMAGE}}", "");
        console.log("[website/generate] {{ABOUT_IMAGE}} not available — placeholder inserted");
      }
    }

    // Save to Supabase (fire-and-forget)
    if (tenant?.id) {
      void admin
        .from("tenant_config")
        .upsert({ tenant_id: tenant.id, website_html: html }, { onConflict: "tenant_id" });
    }

    return NextResponse.json({ html });
  } catch (err) {
    const apiErr = err as { status?: number; error?: { type?: string } };
    const errType = apiErr.error?.type
      ?? (apiErr.status === 401 ? "invalid_api_key"
        : apiErr.status === 429 ? "rate_limited"
        : apiErr.status === 402 ? "insufficient_quota"
        : "unknown");
    const userMsg =
      errType === "invalid_api_key"    ? "AI configuration error — please contact support." :
      errType === "insufficient_quota" ? "AI quota exceeded — please top up OpenAI credits." :
      errType === "rate_limited"       ? "AI is temporarily busy — please try again in a moment." :
                                         "Website generation temporarily unavailable — please try again.";
    console.error("[website/generate] OpenAI error:", errType, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
