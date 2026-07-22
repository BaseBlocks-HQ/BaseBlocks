import { createMDX } from "fumadocs-mdx/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");
const withMDX = createMDX();
const environmentFavicons = {
  preview: "/favicon.preview.ico",
  development: "/favicon.development.ico",
};
const environment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
const environmentFavicon = environmentFavicons[environment];
const filesEndpoint = process.env.FILES_ENDPOINT?.trim();
const filesOrigin = (() => {
  if (!filesEndpoint) {
    return null;
  }

  try {
    return new URL(filesEndpoint).origin;
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
  ...(filesOrigin ? [filesOrigin] : []),
].join(" ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
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
      "style-src 'self' 'unsafe-inline' https://vercel.live",
      "style-src-elem 'self' 'unsafe-inline' https://vercel.live",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      `connect-src ${connectSrc}`,
      "frame-src https://vercel.live",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "*.localhost",
    "*.trycloudflare.com",
    "192.168.1.180",
    "100.108.121.25",
    "naaiyys.tail2c844a.ts.net",
  ],
  serverExternalPackages: [],
  poweredByHeader: false,
  reactCompiler: true,
  experimental: {
    inlineCss: true,
  },
  typescript: {
    // CI and the build script run TypeScript 7 before Next. See docs/maintenance/typescript-7-nextjs.md.
    ignoreBuildErrors: true,
  },
  images: {
    deviceSizes: [640, 750, 828, 960, 1080, 1200, 1280, 1440, 1600, 1920],
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
  async rewrites() {
    if (!environmentFavicon) {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: "/favicon.ico",
          destination: environmentFavicon,
        },
      ],
    };
  },
};

export default withMDX(withNextIntl(nextConfig));
