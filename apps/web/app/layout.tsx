import { Analytics } from "@vercel/analytics/next";
import { getMarketingSiteUrl } from "@/lib/seo/site-url";
import {
  GeistPixelCircle,
  GeistPixelGrid,
  GeistPixelSquare,
  GeistPixelTriangle,
} from "geist/font/pixel";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = localFont({
  display: "optional",
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  display: "optional",
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  preload: false,
});
const MARKETING_SITE_URL = getMarketingSiteUrl();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "black",
};

export const metadata: Metadata = {
  metadataBase: MARKETING_SITE_URL,
  title: {
    default: "BaseBlocks - Idea to site in minutes",
    template: "%s | BaseBlocks",
  },
  description:
    "Build, publish, and share internal sites in minutes. BaseBlocks is a collaborative site builder for teams.",
  keywords: [
    "site builder",
    "internal sites",
    "team collaboration",
    "documentation",
    "knowledge base",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: MARKETING_SITE_URL,
    siteName: "BaseBlocks",
  },
  twitter: {
    card: "summary_large_image",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelTriangle.variable} ${GeistPixelCircle.variable} min-h-screen flex flex-col`}
      >
        {children}
        {process.env.VERCEL === "1" ? <Analytics /> : null}
      </body>
    </html>
  );
}
