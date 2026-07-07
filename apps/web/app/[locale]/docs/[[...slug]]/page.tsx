import {
  DocsContentPage,
  type DocsContentData,
} from "@/modules/marketing/docs/components/docs-content-page";
import { source } from "@/lib/source";
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

  return {
    title: page.data.title ?? "Documentation",
    description: page.data.description,
  };
}

export default async function DocsPageRoute({ params }: PageProps) {
  const { locale, slug } = await params;
  const page = source.getPage(slug, locale);

  if (!page) {
    notFound();
  }

  const pageData = page.data as typeof page.data & DocsContentData;

  return <DocsContentPage content={pageData} fallbackTitle="Documentation" />;
}
