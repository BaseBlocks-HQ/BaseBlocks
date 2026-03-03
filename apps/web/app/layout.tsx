import type { Metadata } from "next";
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
    siteName: "BaseBlocks",
  },
  twitter: {
    card: "summary",
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/favicon.ico" }],
  },
};

// Root layout - Next.js 16 requires html/body tags here
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
