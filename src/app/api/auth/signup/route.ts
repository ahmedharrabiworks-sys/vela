import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, businessDesc, detectedType, country, city, phone, plan } =
      await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // Create user with email_confirm: true — bypasses email confirmation entirely.
    // This avoids the Supabase free-tier email rate limit (2/hour) that breaks
    // client-side signUp. Users can log in immediately after creation.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        business_type: detectedType,
        country,
        city,
        phone,
        plan,
      },
    });

    if (error) {
      console.error("[signup-api] createUser error:", error.code ?? "", error.message);
      if (
        error.message?.toLowerCase().includes("already") ||
        error.message?.toLowerCase().includes("exists") ||
        (error as { code?: string }).code === "email_exists"
      ) {
        return NextResponse.json({ error: "already_exists" }, { status: 409 });
      }
      return NextResponse.json({ error: "create_failed", detail: error.message }, { status: 400 });
    }

    if (data.user) {
      await admin
        .from("tenants")
        .insert({
          owner_id: data.user.id,
          business_name: businessDesc || detectedType || "My Business",
          plan: (plan ?? "pro") as "starter" | "pro" | "premium",
        })
        .then(() => {})
        .catch((err: unknown) => {
          console.warn("[signup-api] tenant insert warning:", err);
        });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[signup-api] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
