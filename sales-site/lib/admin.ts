import "server-only";

/** Server-side admin check against SALES_ADMIN_EMAILS (comma separated). Empty list = nobody. */
export function adminEmails(): string[] {
  return (process.env.SALES_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.trim().toLowerCase());
}
