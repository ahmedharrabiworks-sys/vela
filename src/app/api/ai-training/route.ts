import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";
import { mergeImportedKnowledge, parseKnowledgeBase } from "@/lib/knowledge-base";
import { loadBusinessCurrency, loadKnowledgeBase, saveKnowledgeBase } from "@/lib/knowledge-base-server";

export const dynamic = "force-dynamic";

export type { KnowledgeBase } from "@/lib/knowledge-base";

// The API behind the one knowledge base (see src/lib/knowledge-base.ts).

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  // The currency rides along so the editor can show "40 QAR" as soon as it is typed.
  const [kb, currency] = await Promise.all([loadKnowledgeBase(admin, tenant.id), loadBusinessCurrency(admin, tenant.id)]);
  return NextResponse.json({ ...kb, currency });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const incoming = parseKnowledgeBase(body);
  const merge = new URL(req.url).searchParams.get("merge") === "true";
  const next = merge ? mergeImportedKnowledge(await loadKnowledgeBase(admin, tenant.id), incoming) : incoming;

  const { error, phoneSync } = await saveKnowledgeBase(admin, tenant.id, next);
  if (error) {
    console.error("[ai-training] save error:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, phoneSync });
}
