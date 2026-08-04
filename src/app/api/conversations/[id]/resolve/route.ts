import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/conversations/[id]/resolve
 * Clears needs_human flag and records resolved timestamp.
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

  // Verify the conversation belongs to a tenant owned by this user
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
    .update({
      needs_human: false,
      needs_human_resolved_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (updateErr) {
    console.error("[conversations/resolve] update failed:", updateErr.message);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
