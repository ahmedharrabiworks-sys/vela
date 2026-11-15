"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { isAdmin } from "@/lib/admin";

export type LoginState = { step: "email" | "code"; email?: string; message?: string; error?: string };

function origin() {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Sends a sign-in code (and link) only to admin emails; never creates an account. */
export async function sendCode(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { step: "email", error: "Enter a valid email." };
  // Same answer for everyone, so the page does not reveal who is an admin.
  const sent: LoginState = { step: "code", email, message: "If this email has access, a sign-in code is on its way." };
  if (!isAdmin(email)) return sent;
  const { error } = await supabaseServer().auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: `${origin()}/auth/callback` } });
  if (error) return { step: "email", error: "Could not send the code. Try again in a minute." };
  return sent;
}

export async function verifyCode(_: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const token = String(form.get("code") ?? "").replace(/\D/g, "");
  if (!isAdmin(email) || token.length < 6) return { step: "code", email, error: "That code did not work." };
  const supabase = supabaseServer();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !isAdmin(data.user?.email)) { await supabase.auth.signOut(); return { step: "code", email, error: "That code did not work." }; }
  redirect("/");
}
