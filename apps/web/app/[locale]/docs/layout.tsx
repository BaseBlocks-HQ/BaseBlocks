import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";
import { Link } from "@/i18n/navigation";
import { isAuthenticated } from "@/lib/auth/server";
import { docsI18n, source } from "@/lib/source";
import { Button } from "@baseblocks/ui/button";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { ArrowRight } from "lucide-react";
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
    landingTranslations,
    navigationTranslations,
  ] = await Promise.all([
    isAuthenticated(),
    getTranslations({ locale, namespace: "common" }),
    getTranslations({ locale, namespace: "landing" }),
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

  const authCta = authed ? (
    <Link href="/dashboard">
      <Button size="lg" className="gap-2">
        {commonTranslations("goToDashboard")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button size="lg" className="gap-2">
        {landingTranslations("getStarted")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );

  const docsCta = (
    <Link href="/docs">
      <Button variant="outline" size="lg">
        {landingTranslations("viewDocs")}
      </Button>
    </Link>
  );

  return (
    <>
      <PublicHeader
        authAction={authAction}
        className="md:hidden"
        docsLabel={navigationTranslations("docs")}
        showDocsLink={false}
      />
      <DocsLayout
        containerProps={{
          style: {
            gridTemplate: `"sidebar sidebar header header header"
              "sidebar sidebar toc-popover toc toc"
              "sidebar sidebar main toc toc" 1fr
              "sidebar sidebar footer footer footer" / minmax(min-content, 1fr) var(--fd-sidebar-col) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) var(--fd-toc-width) minmax(min-content, 1fr)`,
          } as CSSProperties,
        }}
        i18n={docsI18n}
        nav={{
          component: (
            <PublicHeader
              authAction={authAction}
              className="hidden md:block [grid-area:header] z-30 md:layout:[--fd-header-height:65px]"
              contentClassName="mx-0 max-w-none px-6 xl:px-8"
              docsLabel={navigationTranslations("docs")}
              showDocsLink={false}
            />
          ),
          enabled: true,
          title: "BaseBlocks",
          url: `/${locale}`,
        }}
        tree={source.getPageTree(locale)}
      >
        {children}
        <PublicFooter
          authCta={authCta}
          className="hidden border-t md:block [grid-area:footer]"
          contentClassName="mx-0 max-w-none"
          ctaSubtitle={landingTranslations("ctaSubtitle")}
          ctaTitle={landingTranslations("ctaTitle")}
          docsCta={docsCta}
          footerCopyright={landingTranslations("footerCopyright")}
          showCta={false}
        />
      </DocsLayout>
      <PublicFooter
        authCta={authCta}
        className="md:hidden"
        ctaSubtitle={landingTranslations("ctaSubtitle")}
        ctaTitle={landingTranslations("ctaTitle")}
        docsCta={docsCta}
        footerCopyright={landingTranslations("footerCopyright")}
        showCta={false}
      />
    </>
  );
}
