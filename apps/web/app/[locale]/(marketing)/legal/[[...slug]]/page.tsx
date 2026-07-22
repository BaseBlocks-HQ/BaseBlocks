import {
  MdxContentPage,
  type MdxContentData,
} from "@/features/marketing/content-pages/mdx-content-page";
import { routing } from "@/i18n/routing";
import { getLegalSource } from "@/features/marketing/content-pages/source";
import type { Locale } from "@baseblocks/i18n";
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

  const suffix = slug?.length ? `/${slug.join("/")}` : "";
  const canonical = `${locale === "fr" ? "/fr" : ""}/legal${suffix}`;

  return {
    title: page.data.title ?? "Legal",
    description: page.data.description,
    alternates: {
      canonical,
      languages: {
        en: `/legal${suffix}`,
        fr: `/fr/legal${suffix}`,
        "x-default": `/legal${suffix}`,
      },
    },
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

  const pageData = page.data as typeof page.data & MdxContentData;

  return <MdxContentPage content={pageData} fallbackTitle="Legal" />;
}
