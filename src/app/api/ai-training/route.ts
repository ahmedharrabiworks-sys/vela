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
      services: existing.services.length > 0 ? existing.services : body.services,
      faqs:     existing.faqs.length > 0     ? existing.faqs     : body.faqs,
      business: {
        hours:         existing.business.hours         || body.business.hours,
        address:       existing.business.address       || body.business.address,
        bookingPolicy: existing.business.bookingPolicy || body.business.bookingPolicy,
        tone:          existing.business.tone          || body.business.tone,
      },
      extra: existing.extra || body.extra,
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
