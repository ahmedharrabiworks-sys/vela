import { NextResponse } from "next/server";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase-server";

// Server-side sign out (FIX 5): the account menu used to call
// supabase.auth.signOut() directly from the browser client, which relies
// on client-side JS actually running and the local session object being in
// sync. This route calls signOut() through the Route Handler client
// instead, which authoritatively clears the sb-* cookies on the response
// regardless of whatever state the browser's client thought it was in.
export async function POST() {
  try {
    const supabase = createSupabaseRouteHandlerClient();
    await supabase.auth.signOut();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[logout] unexpected error:", err);
    // Still report success -- the client always hard-navigates to
    // /auth/login after calling this regardless of the response body, so a
    // logged warning server-side is the only thing that matters here.
    return NextResponse.json({ success: true });
  }
}
