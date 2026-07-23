import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// In-memory rate limiter: ip → { count, windowStart }
// Best-effort per-instance rate limiting (acceptable for this use case).
const RATE_MAP = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT = 60;
const WINDOW_MS  = 60_000;

function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = RATE_MAP.get(ip);
  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    RATE_MAP.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

async function hashVisitor(ip: string, ua: string): Promise<string> {
  // Salted SHA-256 — never stores raw IP or PII, only a one-way hash for unique-visitor counting.
  const salt = process.env.VISITOR_HASH_SALT ?? "vela-visitor-v1";
  const data = new TextEncoder().encode(`${salt}:${ip}:${ua}`);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getDevice(ua: string): "mobile" | "tablet" | "desktop" {
  const u = ua.toLowerCase();
  if (/ipad|tablet|playbook/.test(u)) return "tablet";
  if (/mobile|iphone|android|phone/.test(u)) return "mobile";
  return "desktop";
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { websiteId?: string; path?: string; referrer?: string } = {};
  try { body = await req.json(); } catch { /* ignore */ }

  const { websiteId, path = "/", referrer = "" } = body;
  if (!websiteId || typeof websiteId !== "string" || websiteId.length > 128) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const ua           = req.headers.get("user-agent") ?? "";
  const country      = req.headers.get("x-vercel-ip-country") ?? "";
  const device       = getDevice(ua);
  const visitorHash  = await hashVisitor(ip, ua);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdmin() as any;

  // Verify the website exists before inserting (prevents phantom-id pollution).
  const { data: site } = await admin
    .from("websites")
    .select("id")
    .eq("id", websiteId)
    .eq("is_published", true)
    .maybeSingle();

  if (!site) return NextResponse.json({ ok: false }, { status: 404 });

  await admin.from("site_visits").insert({
    website_id:   websiteId,
    path:         String(path).slice(0, 500),
    referrer:     String(referrer).slice(0, 500),
    country,
    device,
    visitor_hash: visitorHash,
  });

  return NextResponse.json({ ok: true });
}
