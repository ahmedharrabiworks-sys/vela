import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

// GET /api/website/list
// Returns all websites for the authenticated tenant, ordered by most recently updated.
// Called on mount and after any operation that creates / renames / deletes a site.
export async function GET(_req: NextRequest) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdmin() as AdminClient;
  const { data: tenant } = await admin
    .from("tenants").select("id").eq("owner_id", user.id).maybeSingle();

  if (!tenant?.id) return NextResponse.json({ sites: [] });

  // Round M FIX 10: soft-deleted sites (Recycle Bin) must never show up in
  // the normal Sites list. Falls back to an unfiltered query if the
  // deleted_at migration hasn't run yet, rather than breaking the whole
  // list over one optional column.
  let { data: rows, error } = await admin
    .from("websites")
    .select("id, name, slug, is_published, updated_at, published_at")
    .eq("tenant_id", tenant.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error?.code === "42703" || error?.code === "PGRST204") {
    ({ data: rows, error } = await admin
      .from("websites")
      .select("id, name, slug, is_published, updated_at, published_at")
      .eq("tenant_id", tenant.id)
      .order("updated_at", { ascending: false }));
  }

  if (error) {
    console.error("[website/list] query error:", error.message);
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });
  }

  return NextResponse.json({
    sites: (rows ?? []).map((s: {
      id: string;
      name: string | null;
      slug: string | null;
      is_published: boolean;
      updated_at: string | null;
      published_at: string | null;
    }) => ({
      id:           s.id,
      name:         s.name,
      slug:         s.slug,
      is_published: s.is_published,
      updated_at:   s.updated_at,
      // FIX 2 (round O): distinguishes "never published" (no quick
      // Connect/Reconnect shortcut possible -- nothing to restore) from
      // "published before, currently disconnected" (real Reconnect target,
      // restores from the already-stored published_html). Site list menu
      // in website/page.tsx uses this to decide whether to show Reconnect.
      hasPublishedBefore: s.published_at !== null,
    })),
  });
}
