import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const { type, prompt, tone, platform, duration, audience } = body;

  if (!type) return NextResponse.json({ error: "Missing type" }, { status: 400 });

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

  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const { data: cfg } = await admin
    .from("tenant_config")
    .select("services_json, ai_tone, knowledge_base")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  type KbService = { name: string; price?: string; description?: string };
  type Kb = { services?: KbService[]; business?: { hours?: string; address?: string; bookingPolicy?: string }; extra?: string };
  let kb: Kb = {};
  if (cfg?.knowledge_base) {
    try { kb = JSON.parse(cfg.knowledge_base as string) as Kb; } catch { /* ignore */ }
  }

  const kbSvcs = (kb.services ?? []).filter((s): s is KbService => Boolean(s?.name));
  const svcBlock = kbSvcs.length > 0
    ? kbSvcs.map((s) => `• ${s.name}${s.price ? ` — ${s.price}` : ""}${s.description ? `: ${s.description}` : ""}`).join("\n")
    : (Array.isArray(cfg?.services_json) && (cfg.services_json as unknown[]).length > 0
        ? (cfg.services_json as Array<{ name?: string }>).map((s) => `• ${s.name ?? JSON.stringify(s)}`).join("\n")
        : "");

  const businessCtx = [
    `Business: ${tenant.business_name || "the business"}`,
    `Industry: ${tenant.industry || "service business"}`,
    tenant.city ? `City: ${tenant.city}` : "",
    svcBlock ? `Services:\n${svcBlock}` : "",
    kb.business?.hours        ? `Hours: ${kb.business.hours}`                 : "",
    kb.business?.address      ? `Location: ${kb.business.address}`            : "",
    kb.business?.bookingPolicy ? `Booking policy: ${kb.business.bookingPolicy}` : "",
    kb.extra?.trim()          ? `Additional info: ${kb.extra.trim()}`         : "",
    `Preferred tone: ${cfg?.ai_tone || tone || "Professional"}`,
  ].filter(Boolean).join("\n");

  let systemPrompt = "";
  let userPrompt = "";

  if (type === "social") {
    systemPrompt = `You are an expert social media copywriter for ${tenant.business_name || "a local business"} in ${tenant.industry || "services"}.
${businessCtx}
Write ONE compelling, platform-optimized post. Include relevant hashtags at the end.
Be specific, authentic, and action-driving. Do not write a list — write one complete post ready to publish.`;
    userPrompt = `Write a ${tone || "Professional"} ${platform || "Instagram"} post about: ${prompt}`;

  } else if (type === "video") {
    systemPrompt = `You are a short-form video script writer for ${tenant.business_name || "a local business"} in ${tenant.industry || "services"}.
${businessCtx}
Format with clearly labeled sections and timestamps:
[HOOK — 0:00–0:XX] (grab attention instantly)
[PROBLEM — 0:XX–0:XX] (relate to pain point)
[SOLUTION — 0:XX–0:XX] (present the business as answer)
[PROOF — 0:XX–0:XX] (social proof or transformation)
[CTA — 0:XX–end] (clear call to action)
Make it high-converting and authentic for short-form platforms.`;
    userPrompt = `Write a ${duration || "60s"} video script about: ${prompt}`;

  } else if (type === "broadcast") {
    systemPrompt = `You are a WhatsApp broadcast copywriter for ${tenant.business_name || "a local business"}.
${businessCtx}
Write a concise, personal broadcast message under 160 words.
Include a clear CTA and make it feel direct and human, not like spam.
Do NOT include emojis unless they fit naturally.`;
    userPrompt = `Write a WhatsApp broadcast for ${audience || "existing customers"}: ${prompt || "re-engagement campaign"}`;

  } else {
    return NextResponse.json({ error: "Invalid type. Use: social, video, or broadcast" }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 700,
      temperature: 0.82,
    });

    const result = completion.choices[0]?.message?.content ?? "";

    // Save to history (best-effort)
    await admin.from("marketing_generations").insert({
      tenant_id: tenant.id,
      type,
      prompt: userPrompt,
      result,
      metadata: { tone, platform, duration, audience },
    }).catch(() => null);

    return NextResponse.json({ result });
  } catch (err) {
    console.error("Marketing AI error:", err);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ history: [] });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: tenant } = await admin
    .from("tenants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!tenant) return NextResponse.json({ history: [] });

  const { data: history } = await admin
    .from("marketing_generations")
    .select("id, type, prompt, result, metadata, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(12);

  return NextResponse.json({ history: history ?? [] });
}
