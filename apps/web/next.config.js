import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withMDX = createMDX();
const storageEndpoint = process.env.STORAGE_ENDPOINT?.trim();
const storageOrigin = (() => {
  if (!storageEndpoint) {
    return null;
  }

  try {
    return new URL(storageEndpoint).origin;
  } catch {
    return null;
  }
})();
const connectSrc = [
  "'self'",
  "https://*.convex.cloud",
  "wss://*.convex.cloud",
  "https://*.convex.site",
  "https://vercel.live",
  "https://vitals.vercel-insights.com",
  ...(storageOrigin ? [storageOrigin] : []),
].join(" ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-src https://view.officeapps.live.com https://docs.google.com https://vercel.live",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["*.localhost"],
  serverExternalPackages: ["@napi-rs/canvas", "officeparser"],
  reactCompiler: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85, 100],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withMDX(withNextIntl(nextConfig));
