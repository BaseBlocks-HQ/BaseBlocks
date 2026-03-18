import { BeamTableOfContents } from "@/components/BeamTableOfContents";
import { source } from "@/lib/source";
import type { TOCItemType } from "fumadocs-core/toc";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import defaultMdxComponents from "fumadocs-ui/mdx";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import type { ComponentType } from "react";

type PageProps = {
  params: Promise<{ locale: string; slug?: string[] }>;
};

type DocsContentData = {
  body: ComponentType<{ components?: typeof defaultMdxComponents }>;
  toc?: TOCItemType[];
  title?: string;
  description?: string;
};

// Failure modes:
// - Unknown locale/slug pair resolves to no document
// - Missing frontmatter leaves title or description empty
// - Generated static params drift from the route segment names

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
  const MdxContent = pageData.body;

  return (
    <DocsPage
      tableOfContent={{
        component: <BeamTableOfContents />,
      }}
      toc={pageData.toc}
    >
      <DocsTitle>{pageData.title}</DocsTitle>
      <DocsDescription>{pageData.description}</DocsDescription>
      <DocsBody>
        <MdxContent components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
