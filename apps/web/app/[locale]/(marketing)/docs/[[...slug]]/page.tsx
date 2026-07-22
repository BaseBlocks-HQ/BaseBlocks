import {
  MdxContentPage,
  type MdxContentData,
} from "@/features/marketing/content-pages/mdx-content-page";
import { source } from "@/features/marketing/content-pages/source";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

export function generateStaticParams() {
  return source.generateParams("slug", "locale");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const page = source.getPage(slug, locale);

  if (!page) {
    notFound();
  }

  const suffix = slug?.length ? `/${slug.join("/")}` : "";
  const canonical = `${locale === "fr" ? "/fr" : ""}/docs${suffix}`;

  return {
    title: page.data.title ?? "Documentation",
    description: page.data.description,
    alternates: {
      canonical,
      languages: {
        en: `/docs${suffix}`,
        fr: `/fr/docs${suffix}`,
        "x-default": `/docs${suffix}`,
      },
    },
  };
}

export default async function DocsPageRoute({ params }: PageProps) {
  const { locale, slug } = await params;
  const page = source.getPage(slug, locale);

  if (!page) {
    notFound();
  }

  const pageData = page.data as typeof page.data & MdxContentData;

  return <MdxContentPage content={pageData} fallbackTitle="Documentation" />;
}
