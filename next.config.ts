import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// next/font/google self-hosts the font files at build time, so no remote
// font/style hosts are needed at runtime. Tailwind compiles to CSS
// (no runtime JS injection), so 'unsafe-inline' is only required for the
// inline-style JSX patterns used on the page.
const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline' for Next.js-injected boot scripts; 'unsafe-eval' only in
  // dev for Turbopack/HMR. Production drops 'unsafe-eval'.
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  // Browser only ever talks back to our own /api/* — Mailchimp is called
  // server-side. Dev needs ws/wss for HMR.
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
];

const securityHeaders: { key: string; value: string }[] = [
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

if (isProd) {
  securityHeaders.push({
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  });
}

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
