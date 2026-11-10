/**
 * Vela team members who set phone lines up for clients. The list lives in the
 * ADMIN_EMAILS env var (comma separated), is read on every request, and only
 * counts a verified email. Missing or empty: nobody is an admin.
 */
export function isAdminUser(user: { email?: string | null; email_confirmed_at?: string | null } | null | undefined): boolean {
  const email = user?.email?.trim().toLowerCase();
  if (!email || !user?.email_confirmed_at) return false;
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return list.includes(email);
}
