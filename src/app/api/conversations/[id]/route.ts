import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/conversations/[id]
 * Renames a conversation's display name (customer_name — the same field
 * rendered in the conversation list and thread header), OR restores a
 * soft-deleted conversation out of the Recycle Bin (FIX 8, round F).
 * Auth-gated: the conversation's tenant must be owned by the calling user.
 *
 * Body: { name: string } | { restore: true }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, restore } = body as { name?: string; restore?: boolean };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, tenants!inner(owner_id)")
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

  if (restore === true) {
    const { error: restoreErr } = await admin
      .from("conversations")
      .update({ deleted_at: null })
      .eq("id", params.id);
    if (restoreErr) {
      console.error("[conversations/[id]] restore failed:", restoreErr.message);
      return NextResponse.json({ error: "Restore failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const { error: updateErr } = await admin
    .from("conversations")
    .update({ customer_name: trimmed.slice(0, 100) })
    .eq("id", params.id);

  if (updateErr) {
    console.error("[conversations/[id]] rename failed:", updateErr.message);
    return NextResponse.json({ error: "Rename failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, name: trimmed.slice(0, 100) });
}

/**
 * DELETE /api/conversations/[id]
 * FIX 8 (round F): soft-deletes by default (sets deleted_at — the
 * conversation moves to Settings -> Recycle Bin, fully recoverable). Pass
 * ?hard=true to permanently delete instead (used only by the Recycle Bin's
 * "Delete Permanently" action) — messages.conversation_id is ON DELETE
 * CASCADE, so a single row delete is sufficient for that path.
 * Auth-gated: the conversation's tenant must be owned by the calling user.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hard = req.nextUrl.searchParams.get("hard") === "true";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: conv, error: convErr } = await admin
    .from("conversations")
    .select("id, tenants!inner(owner_id)")
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

  if (hard) {
    const { error: deleteErr } = await admin
      .from("conversations")
      .delete()
      .eq("id", params.id);
    if (deleteErr) {
      console.error("[conversations/[id]] hard delete failed:", deleteErr.message);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error: softDeleteErr } = await admin
    .from("conversations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);

  if (softDeleteErr?.code === "PGRST204" || softDeleteErr?.code === "42703") {
    // migration_v30.sql hasn't run yet -- fall back to the old hard-delete
    // behavior rather than making Delete silently do nothing.
    console.warn("[conversations/[id]] deleted_at column missing — run migration_v30.sql. Falling back to hard delete.");
    const { error: fallbackErr } = await admin.from("conversations").delete().eq("id", params.id);
    if (fallbackErr) {
      console.error("[conversations/[id]] fallback hard delete failed:", fallbackErr.message);
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (softDeleteErr) {
    console.error("[conversations/[id]] soft delete failed:", softDeleteErr.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
