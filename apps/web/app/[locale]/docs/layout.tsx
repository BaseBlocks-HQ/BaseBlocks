import { docsI18n, source } from "@/lib/source";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DocsSectionLayout({
  children,
  params,
}: LayoutProps) {
  const { locale } = await params;

  return (
    <DocsLayout
      i18n={docsI18n}
      nav={{
        title: "BaseBlocks Docs",
        url: `/${locale}/docs`,
      }}
      tree={source.getPageTree(locale)}
    >
      {children}
    </DocsLayout>
  );
}
