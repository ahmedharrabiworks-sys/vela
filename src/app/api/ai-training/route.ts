import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

export interface KnowledgeBase {
  services: Array<{ name: string; price: string; duration: string; description: string }>;
  faqs: Array<{ q: string; a: string }>;
  business: {
    hours: string;
    address: string;
    bookingPolicy: string;
    tone: "professional" | "friendly" | "luxury";
  };
  extra: string;
}

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let kb: KnowledgeBase = DEFAULT_KB;
  if (cfg?.knowledge_base) {
    try { kb = { ...DEFAULT_KB, ...JSON.parse(cfg.knowledge_base as string) }; } catch { /* malformed */ }
  }
  return NextResponse.json(kb);
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as KnowledgeBase | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const merge = new URL(req.url).searchParams.get("merge") === "true";
  let saveKb = body;

  if (merge) {
    const { data: cfgRow } = await admin
      .from("tenant_config")
      .select("knowledge_base")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    let existing: KnowledgeBase = DEFAULT_KB;
    if (cfgRow?.knowledge_base) {
      try { existing = { ...DEFAULT_KB, ...JSON.parse(cfgRow.knowledge_base as string) }; } catch { /* ignore */ }
    }
    saveKb = {
      // New data wins — re-training should update the KB, not be silently ignored.
      // Guard against overwriting non-empty existing data with an empty new value.
      services: body.services.length > 0 ? body.services : existing.services,
      faqs:     body.faqs.length > 0     ? body.faqs     : existing.faqs,
      business: {
        hours:         body.business.hours         || existing.business.hours,
        address:       body.business.address       || existing.business.address,
        bookingPolicy: body.business.bookingPolicy || existing.business.bookingPolicy,
        tone:          body.business.tone          || existing.business.tone,
      },
      // Append new extra to existing rather than replacing — both may have unique content
      extra: [existing.extra, body.extra].filter(Boolean).join("\n\n") || "",
    };
  }

  const { error } = await admin
    .from("tenant_config")
    .upsert(
      { tenant_id: tenant.id, knowledge_base: JSON.stringify(saveKb) },
      { onConflict: "tenant_id" }
    );

  if (error) {
    console.error("[ai-training] save error:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
