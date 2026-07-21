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

  const { data: rows, error } = await admin
    .from("websites")
    .select("id, name, slug, is_published, updated_at")
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });

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
    }) => ({
      id:           s.id,
      name:         s.name,
      slug:         s.slug,
      is_published: s.is_published,
      updated_at:   s.updated_at,
    })),
  });
}
