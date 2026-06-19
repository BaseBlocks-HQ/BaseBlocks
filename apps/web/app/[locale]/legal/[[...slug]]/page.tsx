import { BeamTableOfContents } from "@/components/BeamTableOfContents";
import { getDocsMdxComponents } from "@/components/docs/docs-mdx-components";
import { DocsPageHero } from "@/components/docs/docs-page-hero";
import { type Locale, routing } from "@/i18n/routing";
import { getLegalSource } from "@/lib/legal-source";
import type { TOCItemType } from "fumadocs-core/toc";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ComponentType } from "react";

type PageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

type LegalContentData = {
  body: ComponentType<{ components?: ReturnType<typeof getDocsMdxComponents> }>;
  toc?: TOCItemType[];
  title?: string;
  description?: string;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getLegalSource(locale).generateParams("slug").map((page) => ({
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

  const pageData = page.data as typeof page.data & LegalContentData;
  const MdxContent = pageData.body;
  const isTopLevelPage = !slug || slug.length === 0;
  const mdxComponents = getDocsMdxComponents();

  return (
    <DocsPage
      tableOfContent={{
        component: <BeamTableOfContents />,
      }}
      toc={pageData.toc}
    >
      {isTopLevelPage ? (
        <DocsPageHero
          description={pageData.description}
          title={pageData.title ?? "Legal"}
        />
      ) : (
        <>
          <DocsTitle className="bb-docs-title">{pageData.title}</DocsTitle>
          <DocsDescription className="bb-docs-description">
            {pageData.description}
          </DocsDescription>
        </>
      )}
      <DocsBody>
        <MdxContent components={mdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
