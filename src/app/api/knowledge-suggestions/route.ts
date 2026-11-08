import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { applySuggestion } from "@/lib/knowledge-base";
import { loadKnowledgeBase, saveKnowledgeBase } from "@/lib/knowledge-base-server";

export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const COLS = "id, kind, fact, service_name, price, source, created_at";

async function getTenant() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return ensureTenant(user.id, user.email, user.user_metadata);
}

export async function GET() {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createSupabaseAdmin() as any;
  const { data, error } = await admin.from("knowledge_suggestions").select(COLS)
    .eq("tenant_id", tenant.id).eq("status", "pending")
    .order("created_at", { ascending: false }).limit(30);
  // Table not created yet (migration_v41.sql): an honest empty state.
  if (error) return NextResponse.json({ suggestions: [], available: false });
  return NextResponse.json({ suggestions: data ?? [], available: true });
}

export async function POST(req: NextRequest) {
  const tenant = await getTenant();
  if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null) as { id?: string; action?: string } | null;
  if (!body?.id || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createSupabaseAdmin() as any;
  const { data: row, error } = await admin.from("knowledge_suggestions").select(COLS)
    .eq("id", body.id).eq("tenant_id", tenant.id).eq("status", "pending").maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let phoneSync: string = "skipped";
  if (body.action === "approve") {
    const kb = await loadKnowledgeBase(admin, tenant.id);
    const saved = await saveKnowledgeBase(admin, tenant.id, applySuggestion(kb, row));
    if (saved.error) return NextResponse.json({ error: "Save failed" }, { status: 500 });
    phoneSync = saved.phoneSync;
  }

  await admin.from("knowledge_suggestions")
    .update({ status: body.action === "approve" ? "approved" : "rejected", decided_at: new Date().toISOString() })
    .eq("id", body.id).eq("tenant_id", tenant.id);
  return NextResponse.json({ ok: true, phoneSync });
}
