import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/conversations/[id]/read
 * Round M8 FIX 4: marks a conversation as read by the owner (sets
 * last_read_at to now). Deliberately separate from /resolve -- opening a
 * conversation should clear its unread badge, but must never silently flip
 * needs_human (an escalation flag that also feeds the AI Resolution Rate
 * metric elsewhere -- viewing alone is not "resolved").
 * Auth-gated: the conversation's tenant must be owned by the calling user.
 */
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, tenant_id, tenants!inner(owner_id)")
    .eq("id", params.id)
    .single();

  if (convErr || !conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ownerId = (conv.tenants as any)?.owner_id;
  if (ownerId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error: updateErr } = await admin
    .from("conversations")
    .update({ last_read_at: new Date().toISOString() })
    .eq("id", params.id);

  if (updateErr) {
    // migration_v36.sql not run yet -- degrade honestly, never break the
    // conversation view over a missing column.
    if (updateErr.code === "42703" || updateErr.code === "PGRST204") {
      return NextResponse.json({ ok: true, columnMissing: true });
    }
    console.error("[conversations/read] update failed:", updateErr.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
