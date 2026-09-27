import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient, createSupabaseAdmin } from "@/lib/supabase-server";
import { checkPhoneServerSide } from "@/lib/auth/phone-server";

// Finishes onboarding for a user who already has a real, authenticated
// Supabase session but no tenant yet -- reached from BOTH the Google
// OAuth path (via /auth/callback) and, since the real email/password
// confirmation flow was added, the email-confirmation path (also via
// /auth/callback, once the user clicks the link in their inbox and comes
// back with a real session). The route name is kept as-is to avoid
// touching every call site, but nothing here is actually Google-specific
// -- it only checks for an authenticated user, not how they got one.
//
// This is also now where phone gets its authoritative server-side
// re-validation and where it (plus city) actually get persisted to the
// tenants row -- neither the client's own validation nor the E.164 value
// it computed are trusted; the exact same libphonenumber-js check used
// in signup step 2's live UI is re-run here independently (FIX 6).
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseRouteHandlerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { companyName, businessDesc, detectedType, city, phone, plan } = body as Record<string, unknown>;

    const admin = createSupabaseAdmin();

    // Idempotent, a duplicate submit (double-click, back/forward) must not
    // create a second tenant for the same user.
    const { data: existing } = await admin
      .from("tenants")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true });
    }

    // Server-side re-validation of the phone -- the client already
    // validated it live (signup step 2), but that check is never trusted
    // on its own. An E.164 string is self-describing (starts with "+"),
    // no country hint needed. An invalid/empty phone is allowed through
    // as null rather than blocking account creation at this final step --
    // the phone was already required earlier in the wizard; this is a
    // defensive re-check, not a new gate the user can get stuck behind.
    let validatedPhone: string | null = null;
    if (typeof phone === "string" && phone.trim()) {
      const phoneCheck = checkPhoneServerSide(phone);
      if (phoneCheck.ok) {
        validatedPhone = phoneCheck.e164;
      } else {
        console.warn(`[complete-signup] phone failed server-side re-validation, storing null: user=${user.id}`);
      }
    }

    const safeStr = (v: unknown, max: number): string | null => {
      if (typeof v !== "string") return null;
      const t = v.trim();
      return t ? t.slice(0, max) : null;
    };

    const { error: insertErr } = await admin
      .from("tenants")
      .insert({
        owner_id: user.id,
        business_name: safeStr(companyName, 200) || safeStr(businessDesc, 200) || safeStr(detectedType, 200) || "My Business",
        industry: safeStr(detectedType, 100),
        city: safeStr(city, 100),
        phone: validatedPhone,
        plan: (plan === "starter" || plan === "premium" ? plan : "pro") as "starter" | "pro" | "premium",
      });

    if (insertErr) {
      console.error("[complete-signup] tenant insert error:", insertErr.message);
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[complete-signup] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}
