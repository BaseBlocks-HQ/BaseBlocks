import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { getMarketingSiteUrl } from "@/lib/seo/site-url";
import type { Metadata, Viewport } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import "../globals.css";

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

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  fr: "fr_FR",
};

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([
    getLocale(),
    getTranslations("metadata"),
  ]);

  return {
    metadataBase: MARKETING_SITE_URL,
    title: {
      default: t("title"),
      template: "%s | BaseBlocks",
    },
    description: t("description"),
    keywords: [
      "site builder",
      "internal sites",
      "team collaboration",
      "documentation",
      "knowledge base",
    ],
    openGraph: {
      type: "website",
      locale: OG_LOCALE_MAP[locale] ?? "en_US",
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
        {
          url: "/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const locale = await getLocale();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${landingSans.variable} ${landingSerif.variable} min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          {children}
        </ThemeProvider>
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
