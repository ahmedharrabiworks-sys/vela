/**
 * Open-redirect protection (FIX 8) for any `next`/redirect-style query
 * param accepted by an auth route. Only a same-origin relative path is
 * ever honored; anything else (a full URL, a protocol-relative "//evil.com",
 * a "javascript:" scheme, etc.) falls back to a safe default.
 */
export function safeRedirectPath(next: string | null | undefined, fallback = "/app"): string {
  if (!next) return fallback;
  // Must start with exactly one "/" (a relative path), never "//" (protocol-relative,
  // which browsers treat as a full cross-origin URL) and must not contain "://" anywhere.
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("://")) return fallback;
  if (next.toLowerCase().includes("javascript:")) return fallback;
  return next;
}
