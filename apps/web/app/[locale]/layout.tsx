import { ThemeProvider } from "@/components/theme-provider";
import { type Locale, routing } from "@/i18n/routing";
import { getToken } from "@/lib/auth/server";
import { ConvexClientProvider } from "@/lib/convex/provider";
import { MediaViewerModal, MediaViewerProvider } from "@/modules/media-viewer";
import { Toaster } from "@baseblocks/ui/sonner";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

const OG_LOCALE_MAP: Record<string, string> = {
  en: "en_US",
  fr: "fr_FR",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      locale: OG_LOCALE_MAP[locale] ?? "en_US",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client side
  const messages = await getMessages();
  const token = await getToken();

  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ConvexClientProvider initialToken={token}>
          <MediaViewerProvider>
            {children}
            <MediaViewerModal />
          </MediaViewerProvider>
          <Toaster />
        </ConvexClientProvider>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
