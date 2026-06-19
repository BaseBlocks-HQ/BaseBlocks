import { DocsMobileHeaderActions } from "@/components/docs/docs-mobile-header-actions";
import { DocsSidebarHaptics } from "@/components/docs/docs-sidebar-haptics";
import { PublicHeader } from "@/components/public/public-header";
import { Link } from "@/i18n/navigation";
import { isAuthenticated } from "@/lib/auth/server";
import { source } from "@/lib/source";
import { Button } from "@baseblocks/ui/button";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { LayoutDashboard, LogIn } from "lucide-react";
import { getTranslations } from "next-intl/server";
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
  const [authed, commonTranslations, navigationTranslations] =
    await Promise.all([
      isAuthenticated(),
      getTranslations({ locale, namespace: "common" }),
      getTranslations({ locale, namespace: "navigation" }),
    ]);

  const authAction = authed ? (
    <Link href="/dashboard">
      <Button size="sm" className="max-sm:size-8 max-sm:px-0">
        <LayoutDashboard className="h-4 w-4 shrink-0 sm:hidden" />
        <span className="max-sm:sr-only">
          {navigationTranslations("dashboard")}
        </span>
      </Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button size="sm" className="max-sm:size-8 max-sm:px-0">
        <LogIn className="h-4 w-4 shrink-0 sm:hidden" />
        <span className="max-sm:sr-only">{commonTranslations("signIn")}</span>
      </Button>
    </Link>
  );

  return (
    <>
      <DocsSidebarHaptics />
      <DocsLayout
        containerProps={{
          className: "bb-docs-shell",
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
              className="[grid-area:header] z-30 layout:[--fd-header-height:var(--bb-header-height)]"
              contentClassName="mx-0 max-w-none px-6 xl:px-8"
              docsLabel={navigationTranslations("docs")}
              legalLabel={navigationTranslations("legal")}
              mobileActions={<DocsMobileHeaderActions />}
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
