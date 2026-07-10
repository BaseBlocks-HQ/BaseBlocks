import type { TOCItemType } from "fumadocs-core/toc";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { ComponentType } from "react";

export type MdxContentData = {
  body: ComponentType<{ components?: typeof defaultMdxComponents }>;
  description?: string;
  title?: string;
  toc?: TOCItemType[];
};

type MdxContentPageProps = {
  content: MdxContentData;
  fallbackTitle: string;
};

export function MdxContentPage({
  content,
  fallbackTitle,
}: MdxContentPageProps) {
  const MdxContent = content.body;

  return (
    <DocsPage
      tableOfContent={{ style: "clerk" }}
      tableOfContentPopover={{ style: "clerk" }}
      toc={content.toc}
    >
      <DocsTitle>{content.title ?? fallbackTitle}</DocsTitle>
      {content.description ? (
        <DocsDescription>{content.description}</DocsDescription>
      ) : null}
      <DocsBody>
        <MdxContent components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}
