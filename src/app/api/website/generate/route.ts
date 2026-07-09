import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const ALLOWED_IMG_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_IMG_B64 = Math.ceil(5 * 1024 * 1024 * (4 / 3));
const MAX_MSG_LEN = 2000;

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
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${key}` } }
    );
    if (!res.ok) return null;
    const data = await res.json() as { results?: { urls?: { regular?: string } }[] };
    const results = data.results ?? [];
    if (!results.length) return null;
    const pick = results[Math.floor(Math.random() * Math.min(results.length, 3))];
    return pick?.urls?.regular ?? null;
  } catch {
    return null;
  }
}

const BUILD_SYSTEM = `You are a world-class web designer. Generate a complete, premium, modern booking website as a single self-contained HTML file. The output must be Framer/Webflow quality — not a basic flat page.

OUTPUT RULE: Raw HTML only — no markdown, no code fences, no explanation. Start with <!DOCTYPE html> and end with </html>.

━━━ STEP 1: DETECT INDUSTRY, THEN APPLY THIS EXACT AESTHETIC ━━━

MEDICAL / DENTAL / CLINIC / HEALTHCARE:
  Colors: accent #0EA5E9, bg #F0F9FF, dark text #1E293B, white base, section alt #EFF6FF
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@400;700&display=swap')
  Headings: Merriweather, serif — Body: Inter, sans-serif
  Vibe: clinical cleanliness, airy spacing, blues and whites only. Trust-first. CTA: "Book Appointment" or "Schedule Consultation"

RESTAURANT / CAFÉ / FOOD / BAR:
  Colors: accent #92400E, highlight #D97706, dark #1C1917, warm light #FEF3C7, card bg #FFFBEB
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Lato:wght@300;400;700&display=swap')
  Headings: Playfair Display, serif — Body: Lato, sans-serif
  Vibe: warm, appetizing, rich amber+cream palette. CTA: "Reserve a Table" or "Order Now"

GYM / FITNESS / SPORTS / CROSSFIT / YOGA:
  Colors: base #111827, accent #F59E0B, alt #EF4444, light #F9FAFB
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800;900&family=Inter:wght@400;500&display=swap')
  Headings: Montserrat ExtraBold/Black — Body: Inter
  Vibe: bold, powerful, high contrast. Large text. CTA: "Start Free Trial" or "Join Now"

SALON / BEAUTY / SPA / HAIR / NAILS / LASHES:
  Colors: accent #C4956A, soft gold #E8C99A, cream #F9F5F0, text #2D2D2D, muted #8B7355
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Raleway:wght@300;400;600&display=swap')
  Headings: Cormorant Garamond, serif — Body: Raleway
  Vibe: elegant, soft, luxurious. Rose-gold tones, generous white space. CTA: "Book Treatment" or "Reserve Your Spot"

LAW / LEGAL / FINANCE / ACCOUNTING:
  Colors: navy #1E3A5F, gold #C9A84C, off-white #F8F7F4, dark #1A1A2E, mid #4A5568
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Sans+3:wght@300;400;600&display=swap')
  Headings: Libre Baskerville, serif — Body: Source Sans 3
  Vibe: authoritative, structured, conservative. Deep navy + gold. CTA: "Free Consultation" or "Contact Us"

HOTEL / HOSPITALITY / RESORT:
  Colors: deep green #065F46, gold #D4AF37, cream #FAF9F6, dark #1A1A1A
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500&display=swap')
  Headings: Playfair Display — Body: Inter
  Vibe: luxury, refined, sophisticated. Cream + deep green. CTA: "Book Your Stay" or "Reserve Now"

DEFAULT / OTHER:
  Colors: accent #2563EB, light bg #F8FAFC, dark text #1E293B, card bg white
  Fonts: @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap')
  Headings + Body: Inter
  Vibe: clean, modern, professional. CTA: "Get Started" or "Book Now"

━━━ STEP 2: BUILD THESE REQUIRED SECTIONS IN ORDER ━━━

1. STICKY NAV
   position:sticky; top:0; z-index:1000; background: white or semi-transparent with backdrop-filter:blur(12px); box-shadow:0 1px 12px rgba(0,0,0,0.08)
   Left: logo text (business name, font-weight:800, accent color)
   Center (hidden on mobile): nav links (Services, About, Testimonials, Contact) — no underline, hover: accent color
   Right: "Book Now" button — accent bg, white text, border-radius:8px, padding:10px 22px, font-weight:600
   Mobile hamburger menu (visual only — no JS needed, just hide nav links with media query)

2. HERO SECTION
   min-height:90vh; display:flex; align-items:center; position:relative; overflow:hidden
   If HERO_IMAGE provided: background-image:url(HERO_IMAGE); background-size:cover; background-position:center; + dark overlay ::before { background:rgba(0,0,0,0.5); }
   If no HERO_IMAGE: use a rich industry-appropriate gradient (multi-stop, NOT flat)
   Content: headline font-size:clamp(2.5rem,6vw,5rem); font-weight:800; line-height:1.1; color:white; text-shadow:0 2px 20px rgba(0,0,0,0.3)
   Subheadline: font-size:1.25rem; opacity:0.9; max-width:600px; margin:16px auto 32px
   2 CTAs: primary (accent bg, white, border-radius:50px, padding:16px 36px, font-size:1.1rem) + secondary (white outline, same size)
   Layout: centered or left-aligned per industry vibe

3. SERVICES SECTION
   Light bg (industry alt color or #F9FAFB); padding:100px 24px
   Section heading: text-align:center; font-size:2.5rem; font-weight:700; margin-bottom:16px
   Subheading: text-align:center; color:muted; margin-bottom:60px
   Grid: display:grid; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); gap:28px; max-width:1100px; margin:0 auto
   Each card: background:white; border-radius:16px; padding:36px 28px; box-shadow:0 4px 24px rgba(0,0,0,0.08); transition:transform 0.3s ease,box-shadow 0.3s ease
   Card hover: transform:translateY(-6px); box-shadow:0 12px 40px rgba(0,0,0,0.14)
   Card icon: 52px circle with accent bg (light tint), centered icon (unicode emoji or simple SVG)
   Card title: font-size:1.25rem; font-weight:700; margin:20px 0 10px
   Price badge if price given: inline-block; accent-colored pill; font-weight:600
   Use REAL services if provided in instruction. If not, write 3 industry-fitting services with realistic prices.

4. ABOUT / WHY US SECTION
   White bg; padding:100px 24px; max-width:1100px; margin:0 auto
   2-column: left image (if ABOUT_IMAGE: <img> with object-fit:cover, border-radius:16px, height:420px), right: content
   Stack to 1-col on mobile (flex-direction:column-reverse on small screens)
   Heading: "Why Choose [Business Name]?" — font-size:2.2rem; font-weight:800
   3-4 bullet points with checkmark icons (✓ in accent color circle): real differentiators, not generic filler
   Write industry-specific, believable copy — never Lorem ipsum

5. TESTIMONIALS SECTION
   Warm alt bg (light tint of accent); padding:100px 24px
   3 testimonial cards in grid (auto-fit minmax 280px)
   Each card: white bg; border-radius:16px; padding:28px; box-shadow:0 2px 16px rgba(0,0,0,0.06)
   ★★★★★ in gold (#F59E0B), rating count in muted gray
   2-sentence quote in italic
   Avatar: 48px circle with initials (accent bg, white text) + name + "Verified Client"
   Use realistic names from the local region (city/country context from business info)

6. CTA / BOOKING STRIP
   Full-width; accent color gradient (linear-gradient from accent to darker shade); padding:80px 24px; text-align:center
   Large white headline (font-size:2.5rem; font-weight:800)
   Subtitle in white/85% opacity
   Big white button: color accent; border-radius:50px; padding:18px 48px; font-size:1.1rem; font-weight:700
   Hover: transform:translateY(-3px); box-shadow:0 8px 32px rgba(0,0,0,0.2)

7. FOOTER
   Dark bg (#111827 or industry dark); color:#9CA3AF; padding:60px 24px 24px
   3-column grid on desktop, 1-col mobile: logo+tagline | quick links | contact info
   Business name in white, font-weight:800; tagline in muted
   Links: Services, About, Privacy Policy (no underline, hover white)
   Contact: address placeholder, phone, email, hours (realistic for industry)
   Bottom border: copyright © 2025 [Business Name]. All rights reserved.

━━━ QUALITY STANDARDS ━━━
- @import font inside <style> in <head>. NEVER use a <link> tag for fonts.
- <meta charset="UTF-8"> and <meta name="viewport" content="width=device-width,initial-scale=1">
- ZERO horizontal scroll at 375px. Test every section with padding: use padding:X 20px on mobile.
- All img tags: style="width:100%;height:100%;object-fit:cover;display:block" or appropriate dimensions
- Every button: cursor:pointer; transition:all 0.3s ease; + hover state
- Section padding minimum: desktop 100px 24px, mobile 56px 20px (use @media (max-width:768px))
- Cards in grid use auto-fit/minmax — never fixed column counts that would overflow on mobile
- NO flat single-color background for any large section. Every section has visual depth.
- business-specific copy throughout. Never placeholder text. Write real headlines that would convert.`;

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
    return NextResponse.json({ error: "Message too long (max 2000 characters)" }, { status: 400 });
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

      const [heroUrl, aboutUrl, servicesUrl] = await Promise.all([
        fetchUnsplashPhoto(queries.hero),
        fetchUnsplashPhoto(queries.about),
        fetchUnsplashPhoto(queries.services),
      ]);

      // User-uploaded image takes priority for hero
      const heroSrc = validImages.length > 0
        ? `data:${validImages[0].mimeType};base64,${validImages[0].data}`
        : heroUrl;

      userContent = [
        `Business name: ${businessName}`,
        `Industry: ${industry || "service business"}`,
        `City: ${city || ""}`,
        `User instruction: ${msgText}`,
        ``,
        `Real photos to use (embed these URLs directly as background-image or <img src> — do NOT modify the URLs):`,
        `HERO_IMAGE: ${heroSrc ?? "none — use CSS gradient"}`,
        `ABOUT_IMAGE: ${aboutUrl ?? "none — use a colored block with a large icon"}`,
        `SERVICE_IMAGE: ${servicesUrl ?? "none"}`,
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
