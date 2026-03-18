import { PublicHeader } from "@/components/public/public-header";
import { Link } from "@/i18n/navigation";
import { isAuthenticated } from "@/lib/auth/server";
import { source } from "@/lib/source";
import { Button } from "@baseblocks/ui/button";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { getTranslations } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function DocsSectionLayout({
  children,
  params,
}: LayoutProps) {
  const { locale } = await params;
  const [
    authed,
    commonTranslations,
    navigationTranslations,
  ] = await Promise.all([
    isAuthenticated(),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "navigation" }),
  ]);

  const authAction = authed ? (
    <Link href="/dashboard">
      <Button size="sm">{navigationTranslations("dashboard")}</Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button size="sm">{commonTranslations("signIn")}</Button>
    </Link>
  );

  return (
    <>
      <DocsLayout
        containerProps={{
          className: "bb-docs-shell",
          style: {
            gridTemplate: `"sidebar sidebar header toc toc"
              "sidebar sidebar toc-popover toc toc"
              "sidebar sidebar main toc toc" 1fr
              "sidebar sidebar footer footer ." / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
          } as CSSProperties,
        }}
        themeSwitch={{ enabled: false }}
        sidebar={{
          footer: null,
        }}
        links={[
          {
            type: "custom" as const,
            children: (
              <GithubInfo
                owner="naaiyy"
                repo="BaseBlocks"
                token={process.env.GITHUB_TOKEN}
                className="lg:-mx-2"
              />
            ),
          },
        ]}
        nav={{
          component: (
            <PublicHeader
              authAction={authAction}
              className="[grid-area:header] z-30 md:layout:[--fd-header-height:65px]"
              contentClassName="mx-0 max-w-none px-6 xl:px-8"
              docsLabel={navigationTranslations("docs")}
              showDocsLink={false}
              showHomepageLink={true}
              homepageLinkLabel={navigationTranslations("home")}
            />
          ),
          enabled: true,
          title: "BaseBlocks",
          url: `/${locale}`,
        }}
        tree={source.getPageTree(locale)}
      >
        {children}
      </DocsLayout>
    </>
  );
}
