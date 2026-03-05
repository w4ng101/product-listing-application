import type { NextConfig } from "next";

/**
 * HTTP security headers applied to every response.
 *
 * VAPT rationale
 * --------------
 * X-Content-Type-Options    — prevents MIME-type sniffing attacks
 * X-Frame-Options           — blocks clickjacking via iframe embedding
 * X-XSS-Protection          — legacy XSS filter for older browsers
 * Referrer-Policy           — limits referrer leakage on cross-origin navigation
 * Permissions-Policy        — disables unused browser APIs (camera, mic, geo)
 * Content-Security-Policy   — restricts resource origins to prevent XSS/injection
 * Strict-Transport-Security — enforces HTTPS in browsers (HSTS)
 *
 * CSP note
 * --------
 * 'unsafe-eval' is required by webpack HMR in development but must be removed
 * in production builds to close the eval-based XSS vector (OWASP A03).
 * 'unsafe-inline' for scripts is still required because Next.js inlines small
 * hydration scripts; the full fix is nonce-based CSP (future work).
 */
const isDev = process.env.NODE_ENV !== 'production';

const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://cdn.dummyjson.com https://dummyjson.com https://i.dummyjson.com",
      "connect-src 'self' https://dummyjson.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // ─── Security Headers ──────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Apply to all routes including API routes
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },

  // ─── Image Optimisation ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dummyjson.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.dummyjson.com",
        pathname: "/**",
      },
    ],
    // Performance: automatic WebP/AVIF format conversion
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
};

export default nextConfig;
