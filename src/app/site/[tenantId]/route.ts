import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;

  if (!tenantId || !/^[a-zA-Z0-9_-]+$/.test(tenantId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createSupabaseAdmin() as AdminClient;

  const { data: config } = await admin
    .from("tenant_config")
    .select("website_html")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!config?.website_html) {
    return new NextResponse("Site not found", { status: 404 });
  }

  return new NextResponse(config.website_html as string, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
