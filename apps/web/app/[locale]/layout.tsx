import { ThemeProvider } from "@/core/theme/theme-provider";
import { type Locale, routing } from "@/i18n/routing";
import { Toaster } from "@baseblocks/ui/sonner";
import { MotionConfig } from "motion/react";
import type { Metadata, ResolvingMetadata } from "next";
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

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const parentMetadata = await parent;
  const parentOpenGraph = parentMetadata.openGraph;

  return {
    title: t("title"),
    description: t("description"),
    openGraph: parentOpenGraph
      ? {
          ...parentOpenGraph,
          url: parentOpenGraph.url ?? undefined,
          locale: OG_LOCALE_MAP[locale] ?? "en_US",
        }
      : {
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
  return (
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <MotionConfig reducedMotion="user">
          {children}
          <Toaster />
        </MotionConfig>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
