import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin";

// Google sign-in and email links land here. Non-admins are signed straight out.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const supabase = supabaseServer();
  if (code) await supabase.auth.exchangeCodeForSession(code);
  const { data } = await supabase.auth.getUser();
  if (!isAdmin(data.user?.email)) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL(data.user ? "/login?e=denied" : "/login?e=failed", url.origin));
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
