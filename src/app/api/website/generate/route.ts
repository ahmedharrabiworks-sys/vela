import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const BUILD_SYSTEM = `You are an expert web designer. Generate a complete, beautiful, single-file HTML page for the business described.

Rules:
- Output ONLY raw HTML — no markdown, no code fences, no explanation
- All CSS must be inline inside a <style> tag in <head>
- Zero external dependencies (no CDN, no external fonts, no images) — use CSS gradients for visuals
- Modern dark hero section with brand accent color #FF6B35 (orange) unless user specifies otherwise
- Include: nav bar, hero with headline + CTA, services/products section, trust badges, and a booking/contact CTA strip
- Footer with business name
- Fully responsive — use CSS Grid and Flexbox, mobile-first
- Include a floating Vela AI chat bubble in bottom-right (visual only, no JS needed)
- Write clean, minified-style HTML — no unnecessary whitespace`;

const REVISE_SYSTEM = `You are an expert web designer. The user has an existing website and wants to revise it.
Apply the requested change surgically to the provided HTML.
Rules:
- Output ONLY the complete updated HTML — no markdown, no code fences, no explanation
- Preserve all existing sections; only modify what the user requested
- Maintain all inline CSS; do not add external dependencies`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as {
    message?: string;
    currentHtml?: string;
  };

  const { message, currentHtml } = body;
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: tenant } = await admin
    .from("tenants")
    .select("id, business_name, industry, city")
    .eq("owner_id", user.id)
    .single();

  const businessName = (tenant?.business_name as string) || "My Business";
  const industry = (tenant?.industry as string) || "service business";
  const city = (tenant?.city as string) || "";

  const isRevision = !!currentHtml;

  const systemPrompt = isRevision ? REVISE_SYSTEM : BUILD_SYSTEM;

  const userContent = isRevision
    ? `Current HTML:\n\`\`\`html\n${currentHtml}\n\`\`\`\n\nRevision request: ${message}`
    : `Business name: ${businessName}\nIndustry: ${industry}\nCity: ${city}\n\nUser instruction: ${message}`;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 4000,
      temperature: 0.5,
    });

    let html = completion.choices[0]?.message?.content ?? "";

    // Strip any accidental code fences
    html = html.replace(/^```html\n?/, "").replace(/\n?```$/, "").trim();

    // Best-effort: save to Supabase
    if (tenant?.id) {
      admin
        .from("tenant_config")
        .upsert({ tenant_id: tenant.id, website_html: html }, { onConflict: "tenant_id" })
        .catch(() => null);
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
      errType === "insufficient_quota" ? "AI quota exceeded — the site owner needs to top up OpenAI credits." :
      errType === "rate_limited"       ? "AI is temporarily busy — please try again in a moment." :
                                         "Website generation temporarily unavailable — please try again.";
    console.error("[website/generate] OpenAI error:", errType, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}
