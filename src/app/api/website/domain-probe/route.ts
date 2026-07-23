import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Public probe endpoint — used by /api/website/domain (GET) to confirm a custom
// domain actually routes to this server (not just DNS-pointing-at-Vercel).
// No auth needed: returns a static marker, not sensitive data.
export async function GET() {
  return NextResponse.json({ vela: true });
}
