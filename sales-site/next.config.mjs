/** Private sales dashboard: never indexed, never framed, strict headers. */
const security = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];
export default {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() { return [{ source: "/:path*", headers: security }]; },
};
