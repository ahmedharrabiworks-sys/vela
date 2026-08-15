import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * GET /api/widget/history?tenantId=...&conversationId=...
 *
 * FIX 4: reopening the widget previously always started a blank chat, even
 * once conversationId persistence was fixed to survive a tab close --
 * restoring the ID alone reconnects the BACKEND conversation, but the
 * visitor never saw their prior messages again. This endpoint lets the
 * widget refetch real message history for a persisted conversation on
 * mount, unauthenticated (an anonymous site visitor has no session) but
 * safely scoped: both tenantId AND conversationId must match the same real
 * conversation row -- a random/guessed conversationId (a 122-bit UUID) is
 * not a meaningful attack surface, and this is the same "possession of the
 * ID is the access boundary" model /api/ai/reply already uses to append to
 * a conversation, just applied to a read instead of a write.
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get("tenantId");
  const conversationId = req.nextUrl.searchParams.get("conversationId");

  if (!tenantId || !conversationId) {
    return NextResponse.json({ error: "tenantId and conversationId are required" }, { status: 400, headers: CORS });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!conv) {
    return NextResponse.json({ messages: [] }, { headers: CORS });
  }

  const { data: messages } = await admin
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .eq("tenant_id", tenantId)
    .eq("is_test", false)
    .order("created_at", { ascending: true })
    .limit(100);

  return NextResponse.json({ messages: messages ?? [] }, { headers: CORS });
}
