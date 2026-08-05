import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureTenant } from "@/lib/ensure-tenant";

const VALID = new Set(["orange", "blue", "teal"]);

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ theme: "orange" });

  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    const { data } = await admin
      .from("tenant_config")
      .select("theme_preset")
      .eq("tenant_id", tenant.id)
      .single();
    const theme = data?.theme_preset && VALID.has(data.theme_preset) ? data.theme_preset : "orange";
    return NextResponse.json({ theme });
  } catch {
    return NextResponse.json({ theme: "orange" });
  }
}

export async function PUT(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const { theme } = await req.json();
  if (!VALID.has(theme)) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const tenant = await ensureTenant(user.id, user.email, user.user_metadata);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const admin = createSupabaseAdmin() as any;
    await admin
      .from("tenant_config")
      .update({ theme_preset: theme })
      .eq("tenant_id", tenant.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
