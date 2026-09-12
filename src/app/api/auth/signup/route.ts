import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

// Security audit Part 1 (auth): this route had zero rate limiting -- it
// creates a real, fully email-confirmed Supabase Auth user plus a real
// tenants row directly via the admin API, with no CAPTCHA and no cap of any
// kind, so it could be scripted to mass-create accounts. Same in-memory
// sliding-window pattern already used in ai/reply/route.ts and
// structured-booking/route.ts, keyed by IP since there's no tenant yet at
// this point. 5/hour comfortably covers a real person retrying a typo'd
// signup; it exists purely as an abuse ceiling. Same limitation as those
// routes: resets on cold start / across serverless instances -- a durable
// store would be needed for airtight enforcement.
const SIGNUP_RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const SIGNUP_RATE_LIMIT = 5;
const SIGNUP_WINDOW_MS  = 60 * 60_000;

function isSignupRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = SIGNUP_RATE_MAP.get(ip);
  if (!entry || now - entry.windowStart >= SIGNUP_WINDOW_MS) {
    SIGNUP_RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= SIGNUP_RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export async function POST(req: Request) {
  try {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = (forwarded ? forwarded.split(",")[0] : req.headers.get("x-real-ip") ?? "unknown").trim();

    if (isSignupRateLimited(ip)) {
      console.warn(`[signup-api] RATE LIMIT HIT (${SIGNUP_RATE_LIMIT}/hr): ip=${ip}`);
      return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
    }

    const { email, password, fullName, companyName, businessDesc, detectedType, country, city, phone, plan } =
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
          business_name: companyName || businessDesc || detectedType || "My Business",
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
