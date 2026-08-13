import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// The Phone Agent's own knowledge base -- separate from tenant_config.knowledge_base
// (which the Training interview and Magic Import populate). Kept in its own column
// so it can be viewed and edited directly, independent of the interview flow. Both
// KBs are automatically merged when building the real Phone Agent's system prompt
// (see phone/route.ts and call-webhook/route.ts) and when building the internal
// Assistant's context (see context/route.ts) -- the split is structural, the
// cross-feed is automatic, nothing here requires the owner to manage it manually.
export interface PhoneAgentKb {
  services: Array<{ name: string; price: string; duration: string; description: string }>;
  business: { hours: string; address: string; bookingPolicy: string };
  extra: string;
}

const DEFAULT_KB: PhoneAgentKb = {
  services: [],
  business: { hours: "", address: "", bookingPolicy: "" },
  extra: "",
};

async function getAuthAndTenant() {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { error: "Unauthorized", status: 401 } as const;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return { tenant };
  } catch {
    return { error: "Account setup required", status: 500 } as const;
  }
}

export async function GET() {
  const result = await getAuthAndTenant();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const admin = createSupabaseAdmin() as any;
  const { data: cfg } = await admin
    .from("tenant_config")
    .select("phone_agent_knowledge_base")
    .eq("tenant_id", result.tenant.id)
    .maybeSingle();

  let kb: PhoneAgentKb = DEFAULT_KB;
  if (cfg?.phone_agent_knowledge_base) {
    try {
      const raw = typeof cfg.phone_agent_knowledge_base === "string"
        ? JSON.parse(cfg.phone_agent_knowledge_base)
        : cfg.phone_agent_knowledge_base;
      kb = { ...DEFAULT_KB, ...raw, business: { ...DEFAULT_KB.business, ...(raw?.business ?? {}) } };
    } catch { /* malformed */ }
  }
  return NextResponse.json(kb);
}

export async function POST(req: NextRequest) {
  const result = await getAuthAndTenant();
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json().catch(() => null) as PhoneAgentKb | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const admin = createSupabaseAdmin() as any;
  const { error } = await admin
    .from("tenant_config")
    .upsert(
      { tenant_id: result.tenant.id, phone_agent_knowledge_base: JSON.stringify(body) },
      { onConflict: "tenant_id" }
    );

  if (error) {
    console.error("[phone-knowledge] save error:", error);
    const isMissingColumn = error.code === "42703" || (typeof error.message === "string" && error.message.includes("does not exist"));
    if (isMissingColumn) {
      return NextResponse.json(
        { error: "Database column missing. Run the latest Supabase migration to create phone_agent_knowledge_base." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
