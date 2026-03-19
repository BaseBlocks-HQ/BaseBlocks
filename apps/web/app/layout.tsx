import { Analytics } from "@vercel/analytics/next";
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
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "baseblocks.dev";
const socialImage = "/baseblocks-social-preview.png";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(`https://${ROOT_DOMAIN}`),
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
    url: `https://${ROOT_DOMAIN}`,
    siteName: "BaseBlocks",
    images: [
      {
        url: socialImage,
        width: 2974,
        height: 1630,
        alt: "BaseBlocks social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [socialImage],
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/favicon.ico" }],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${GeistPixelSquare.variable} ${GeistPixelGrid.variable} ${GeistPixelTriangle.variable} ${GeistPixelCircle.variable} min-h-screen flex flex-col`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
