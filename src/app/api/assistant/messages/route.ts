import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

export const dynamic = "force-dynamic";

/**
 * FIX 4 (round J): persists the internal owner-facing AI assistant's
 * conversation server-side, tenant-scoped, so it survives a refresh or
 * navigation instead of living only in React state (VelaAssistant.tsx's
 * old behavior).
 *
 * GET    -> real, non-deleted history for this tenant, oldest first
 * POST   -> append one real message { role, content, images?, isError? }
 * DELETE -> "Clear" -- soft-deletes the CURRENT conversation as one batch
 *           (same deleted_at timestamp on every row), restorable from the
 *           existing Recycle Bin, never a hard delete.
 *
 * A table that doesn't exist yet (migration_v31.sql pending) degrades
 * gracefully everywhere: history loads empty, sends still work (just don't
 * persist), Clear is a no-op -- chat functionality itself is never blocked
 * by a missing optional persistence layer.
 */

async function getTenantId(): Promise<string | null> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    return tenant.id;
  } catch {
    return null;
  }
}

const isMissingTable = (e: { code?: string } | null) =>
  e?.code === "PGRST205" || e?.code === "42P01" || e?.code === "PGRST204" || e?.code === "42703";

export async function GET() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data, error } = await admin
    .from("assistant_messages")
    .select("id, role, content, images, is_error, created_at")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (isMissingTable(error)) {
    console.warn("[assistant/messages] assistant_messages table missing — run migration_v31.sql.");
    return NextResponse.json({ messages: [] });
  }
  if (error) {
    console.error("[assistant/messages] fetch failed:", error.message);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }

  type Row = { id: string; role: string; content: string; images: string[] | null; is_error: boolean; created_at: string };
  const messages = (data as Row[]).map((r) => ({
    id: r.id, role: r.role, content: r.content, images: r.images ?? undefined, isError: r.is_error, createdAt: r.created_at,
  }));
  return NextResponse.json({ messages });
}

export async function POST(req: NextRequest) {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { role?: string; content?: string; images?: string[]; isError?: boolean };
  if ((body.role !== "user" && body.role !== "assistant") || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "role and content are required" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const { data, error } = await admin
    .from("assistant_messages")
    .insert({
      tenant_id: tenantId,
      role: body.role,
      content: body.content,
      images: body.images && body.images.length > 0 ? body.images : null,
      is_error: body.isError === true,
    })
    .select("id")
    .single();

  if (isMissingTable(error)) {
    // Not fatal -- the chat itself already succeeded; only persistence is skipped.
    return NextResponse.json({ ok: false, persisted: false });
  }
  if (error) {
    console.error("[assistant/messages] insert failed:", error.message);
    return NextResponse.json({ ok: false, persisted: false });
  }
  return NextResponse.json({ ok: true, persisted: true, id: data?.id });
}

export async function DELETE() {
  const tenantId = await getTenantId();
  if (!tenantId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;
  const clearedAt = new Date().toISOString();
  const { error, count } = await admin
    .from("assistant_messages")
    .update({ deleted_at: clearedAt })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .select("id", { count: "exact" });

  if (isMissingTable(error)) {
    return NextResponse.json({ ok: true, clearedCount: 0 });
  }
  if (error) {
    console.error("[assistant/messages] clear failed:", error.message);
    return NextResponse.json({ error: "Clear failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, clearedCount: count ?? 0 });
}
