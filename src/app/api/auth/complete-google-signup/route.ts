import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, createSupabaseAdmin } from "@/lib/supabase-server";

// Finishes onboarding for a user who already has a real Supabase auth
// account (created by Google OAuth in /auth/callback) but no tenant yet --
// mirrors /api/auth/signup's tenant-creation step, minus creating an auth
// user, since one already exists.
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseRouteHandlerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const { companyName, businessDesc, detectedType, plan } = await req.json();

    const admin = createSupabaseAdmin();

    // Idempotent — a duplicate submit (double-click, back/forward) must not
    // create a second tenant for the same user.
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    const { error: insertErr } = await admin
      .from("tenants")
      .insert({
        owner_id: user.id,
        business_name: companyName || businessDesc || detectedType || "My Business",
        plan: (plan ?? "pro") as "starter" | "pro" | "premium",
      });

    if (insertErr) {
      console.error("[complete-google-signup] tenant insert error:", insertErr.message);
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[complete-google-signup] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
