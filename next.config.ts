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
  // connect.facebook.net hosts the Meta Pixel base script (fbevents.js).
  // www.facebook.com hosts signals/iwl.js (Initial Web Loader) which
  // fbevents.js pulls in for newer pixel features.
  `script-src 'self' 'unsafe-inline' https://connect.facebook.net https://www.facebook.com${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  // www.facebook.com hosts the 1x1 tracking pixel (noscript fallback +
  // fbq image-beacon path on browsers without sendBeacon).
  "img-src 'self' data: https://www.facebook.com",
  "font-src 'self' data:",
  // Browser-side fetches: our own /api/*, plus Meta Pixel beacons to
  // *.facebook.com and connect.facebook.net. Mailchimp/CAPI are server-side.
  // Dev needs ws/wss for HMR.
  `connect-src 'self' https://*.facebook.com https://connect.facebook.net${isProd ? "" : " ws: wss:"}`,
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
