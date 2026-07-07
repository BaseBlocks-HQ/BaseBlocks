import {
  DocsContentPage,
  type DocsContentData,
} from "@/modules/marketing/docs/components/docs-content-page";
import { type Locale, routing } from "@/i18n/routing";
import { getLegalSource } from "@/lib/legal-source";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getLegalSource(locale)
      .generateParams("slug")
      .map((page) => ({
        locale,
        ...page,
      })),
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const page = getLegalSource(locale as Locale).getPage(slug);

  if (!page) {
    notFound();
  }

  return {
    title: page.data.title ?? "Legal",
    description: page.data.description,
  };
}

export default async function LegalPageRoute({ params }: PageProps) {
  const { locale, slug } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const page = getLegalSource(locale as Locale).getPage(slug);

  if (!page) {
    notFound();
  }

  const pageData = page.data as typeof page.data & DocsContentData;

  return <DocsContentPage content={pageData} fallbackTitle="Legal" />;
}
