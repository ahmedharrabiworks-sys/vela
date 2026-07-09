import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

const MAX_TRANSCRIPT_LEN = 20_000;

const EXTRACT_SYSTEM = `You are a data extraction assistant. Given a voice call transcript between a business owner and Vela (an AI assistant), extract structured business knowledge.

Return ONLY valid JSON in this exact shape — no markdown, no explanation:
{
  "services": [{ "name": "", "price": "", "duration": "", "description": "" }],
  "faqs": [],
  "business": {
    "hours": "",
    "address": "",
    "bookingPolicy": "",
    "tone": "professional"
  },
  "extra": ""
}

Rules:
- services: extract each service/product mentioned with its price. Leave price/duration empty if not mentioned.
- faqs: always return [] (FAQ extraction not needed from a call).
- business.hours: working hours if mentioned, else "".
- business.address: address or location if mentioned, else "".
- business.bookingPolicy: cancellation/booking policy if mentioned, else "".
- business.tone: infer from the owner's language style — "professional", "friendly", or "luxury".
- extra: put any other important details (common customer questions, special offers, important notes) as plain text. Keep it concise.
- If information is not in the transcript, use empty strings. Never invent data.`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { transcript?: string };
  const transcript = (body.transcript ?? "").slice(0, MAX_TRANSCRIPT_LEN).trim();

  if (!transcript) {
    return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let tenant: { id: string };
  try {
    tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  } catch (err) {
    console.error("[save-call] ensureTenant:", err);
    return NextResponse.json({ error: "Account setup required" }, { status: 500 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });
  }

  // Extract structured KB from transcript
  let newKb: Record<string, unknown> = {};
  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: EXTRACT_SYSTEM },
        { role: "user",   content: `Transcript:\n${transcript}` },
      ],
      max_tokens: 1500,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    newKb = JSON.parse(raw) as Record<string, unknown>;
  } catch (err) {
    console.error("[save-call] extraction error:", err);
    return NextResponse.json({ error: "Failed to extract knowledge" }, { status: 500 });
  }

  // Load existing KB and merge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let existingKb: Record<string, unknown> = {};
  if (cfg?.knowledge_base) {
    try { existingKb = JSON.parse(cfg.knowledge_base as string); } catch { /* ignore */ }
  }

  // Merge: new data wins over existing, except we append extra text
  const merged = {
    ...existingKb,
    ...newKb,
    extra: [
      (existingKb.extra as string | undefined)?.trim(),
      (newKb.extra as string | undefined)?.trim(),
    ].filter(Boolean).join("\n\n") || "",
  };

  const { error: updateErr } = await admin
    .from("tenant_config")
    .update({ knowledge_base: JSON.stringify(merged) })
    .eq("tenant_id", tenant.id);

  if (updateErr) {
    console.error("[save-call] update error:", updateErr);
    return NextResponse.json({ error: "Failed to save knowledge base" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, extracted: merged });
}
