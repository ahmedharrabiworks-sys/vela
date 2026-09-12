/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [],
  },
  transpilePackages: ["three"],
  experimental: {
    optimizePackageImports: ["@react-three/fiber", "@react-three/drei", "framer-motion"],
    serverComponentsExternalPackages: ["pdf-parse"],
  },
  // Security audit Part 5: no security headers were set anywhere before this.
  // Only the headers with zero risk of breaking a real feature are added
  // here. Deliberately NOT included:
  //   - Content-Security-Policy: this app loads the Facebook JS SDK, Google
  //     OAuth, Unsplash/OpenAI-served images, and generated customer website
  //     HTML with its own inline <script>/<style> (nav toggles, edit-mode
  //     scripts) -- a CSP tight enough to matter but wrong in even one place
  //     would silently break one of those in production. Needs its own
  //     dedicated pass with real per-feature verification, not a guess here.
  //   - Permissions-Policy: the AI voice phone agent (a flagship feature)
  //     needs real microphone access from both the dashboard AND, per
  //     site/[tenantId]/route.ts, potentially from a customer's published
  //     site -- a wrong policy value breaks a paid feature. Same reasoning
  //     as CSP: needs its own verified pass, not included here.
  // X-Frame-Options is intentionally NOT applied to /widget/* -- that route
  // is the embeddable chat widget, designed to be iframed on arbitrary
  // third-party customer websites; blocking that would break the product.
  async headers() {
    return [
      {
        source: "/((?!widget).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
