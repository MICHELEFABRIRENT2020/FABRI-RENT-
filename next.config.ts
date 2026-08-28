import type { NextConfig } from "next";

/**
 * Security headers (section 11). CSP is intentionally permissive on
 * `connect-src`/`frame-src` for Stripe.js and Google Maps, both loaded
 * only when their respective env keys are configured; tighten further if
 * an integration is permanently disabled for a given deployment.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://maps.gstatic.com https://maps.googleapis.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.stripe.com https://maps.googleapis.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(self)" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // "standalone" is for the self-hosted Docker deploy (Dockerfile copies
  // .next/standalone and runs server.js directly - see DEPLOYMENT.md). On
  // Vercel it must stay unset: Vercel's own build packaging is incompatible
  // with standalone output and fails in its post-build step with an ENOENT
  // on .next/next-server (confirmed against public Vercel/Next.js reports -
  // see e.g. vercel/next.js#43654). Vercel sets VERCEL=1 during its builds.
  output: process.env.VERCEL ? undefined : "standalone",
  // Prisma's generator output is customized to src/generated/prisma (outside
  // node_modules), so Next's automatic file tracing doesn't reliably follow
  // the dynamic require() of the native query engine binary into the
  // deployed serverless function - confirmed by the runtime error naming
  // the exact rhel-openssl-3.0.x engine file as missing even though
  // binaryTargets generates it. Force it into every route's trace.
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/**/*"],
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
