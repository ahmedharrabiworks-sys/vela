import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/conversations/[id]
 * Renames a conversation's display name (customer_name — the same field
 * rendered in the conversation list and thread header).
 * Auth-gated: the conversation's tenant must be owned by the calling user.
 *
 * Body: { name: string }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name } = body as { name?: string };
  const trimmed = name?.trim();
  if (!trimmed) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

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
 * Permanently deletes a conversation and its messages (messages.conversation_id
 * is ON DELETE CASCADE, so a single row delete is sufficient).
 * Auth-gated: the conversation's tenant must be owned by the calling user.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const { error: deleteErr } = await admin
    .from("conversations")
    .delete()
    .eq("id", params.id);

  if (deleteErr) {
    console.error("[conversations/[id]] delete failed:", deleteErr.message);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
