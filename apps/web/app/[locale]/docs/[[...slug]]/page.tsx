import { BeamTableOfContents } from "@/components/BeamTableOfContents";
import { getDocsMdxComponents } from "@/components/docs/docs-mdx-components";
import { DocsPageHero } from "@/components/docs/docs-page-hero";
import { source } from "@/lib/source";
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

type DocsContentData = {
  body: ComponentType<{ components?: ReturnType<typeof getDocsMdxComponents> }>;
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
  const isTopLevelPage = !slug || slug.length <= 1;
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
          title={pageData.title ?? "Documentation"}
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
