import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import type { KnowledgeBase } from "@/app/api/ai-training/route";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

const DEFAULT_KB: KnowledgeBase = {
  services: [],
  faqs: [],
  business: { hours: "", address: "", bookingPolicy: "", tone: "professional" },
  extra: "",
};

// Round M6 FIX 6(b): real, owner-scoped queue of customer-requested services
// that aren't trained yet. GET lists pending rows (Train Your AI surfaces
// these with Dismiss / Add-as-service actions). POST performs one of those
// two actions on a single row.

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  const admin = createSupabaseAdmin() as AdminClient;

  const { data, error } = await admin
    .from("pending_service_requests")
    .select("id, service_name, created_at, leads(name, phone)")
    .eq("tenant_id", tenant.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    // Table not migrated yet -- honest empty state, never a fake list.
    if (error.code === "PGRST205" || error.code === "42P01") {
      return NextResponse.json({ requests: [] });
    }
    console.error("[pending-services] list error:", error.code, error.message);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }

  type Row = { id: string; service_name: string; created_at: string; leads?: { name: string | null; phone: string | null } | null };
  const requests = ((data ?? []) as Row[]).map((r) => ({
    id: r.id,
    serviceName: r.service_name,
    createdAt: r.created_at,
    leadName: r.leads?.name ?? null,
    leadPhone: r.leads?.phone ?? null,
  }));

  return NextResponse.json({ requests });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { id?: string; action?: "dismiss" | "add"; price?: string };
  if (!body.id || (body.action !== "dismiss" && body.action !== "add")) {
    return NextResponse.json({ error: "id and a valid action are required" }, { status: 400 });
  }

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  const admin = createSupabaseAdmin() as AdminClient;

  const { data: row } = await admin
    .from("pending_service_requests")
    .select("id, service_name")
    .eq("id", body.id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (body.action === "dismiss") {
    await admin.from("pending_service_requests").update({ status: "dismissed" }).eq("id", body.id).eq("tenant_id", tenant.id);
    return NextResponse.json({ ok: true });
  }

  // action === "add": price is the one real required field the AI doesn't
  // already have -- everything else (name) came straight from the customer's
  // own request.
  const price = (body.price ?? "").trim();
  if (!price) return NextResponse.json({ error: "Price is required to add this as a service." }, { status: 400 });

  const { data: cfg } = await admin
    .from("tenant_config")
    .select("knowledge_base")
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  let kb: KnowledgeBase = DEFAULT_KB;
  if (cfg?.knowledge_base) {
    try { kb = { ...DEFAULT_KB, ...JSON.parse(cfg.knowledge_base as string) }; } catch { /* malformed, fall back to default */ }
  }

  const newService = { name: (row as { service_name: string }).service_name, price, duration: "", description: "" };
  const saveKb: KnowledgeBase = { ...kb, services: [...kb.services, newService] };

  const { error: saveErr } = await admin.from("tenant_config").upsert(
    {
      tenant_id: tenant.id,
      knowledge_base: JSON.stringify(saveKb),
      knowledge_base_updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id" }
  );
  if (saveErr) {
    console.error("[pending-services] add-as-service save error:", saveErr.message);
    return NextResponse.json({ error: "Failed to save the new service" }, { status: 500 });
  }

  await admin.from("pending_service_requests").update({ status: "added" }).eq("id", body.id).eq("tenant_id", tenant.id);

  return NextResponse.json({ ok: true, service: newService });
}
