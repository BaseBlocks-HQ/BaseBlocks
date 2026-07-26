import { getMarketingSiteUrl } from "@/lib/seo/site-url";
import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const MARKETING_SITE_URL = getMarketingSiteUrl();
const landingSans = Manrope({
  subsets: ["latin"],
  variable: "--font-landing-sans",
});
const landingSerif = Newsreader({
  axes: ["opsz"],
  subsets: ["latin"],
  variable: "--font-landing-serif",
});

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
        className={`${landingSans.variable} ${landingSerif.variable} min-h-screen flex flex-col`}
      >
        {children}
        {process.env.VERCEL === "1" ? (
          <>
            <script
              // biome-ignore lint/security/noDangerouslySetInnerHtml: Static Vercel Analytics bootstrap; no user data is interpolated.
              dangerouslySetInnerHTML={{
                __html:
                  "window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};",
              }}
            />
            <script defer src="/_vercel/insights/script.js" />
          </>
        ) : null}
      </body>
    </html>
  );
}
