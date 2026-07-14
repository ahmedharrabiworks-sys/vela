import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// ── POST /api/website/reset ────────────────────────────────────────────────────
// Clears the current draft so the user can start a new website from scratch.
// PRESERVES: website_versions, published_html, is_published, slug, website record.
// CLEARS:    draft_html, draft_spec, website_html, website_chat, website_intake.
export async function POST(_req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();
  if (!tenant?.id) return NextResponse.json({ error: "No tenant found" }, { status: 404 });

  // Clear draft from the most-recently-updated website (don't touch published_html)
  const { data: site } = await admin
    .from("websites")
    .select("id")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (site?.id) {
    await admin
      .from("websites")
      .update({
        draft_html: null,
        draft_spec: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", site.id);
  }

  // Clear draft state from tenant_config (preserve website_versions and domain fields)
  await admin.from("tenant_config").upsert({
    tenant_id:      tenant.id,
    website_html:   null,
    website_chat:   null,
    website_intake: null,
  }, { onConflict: "tenant_id" });

  return NextResponse.json({ ok: true });
}
