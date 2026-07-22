import { source } from "@/features/marketing/content-pages/source";
import { GithubInfo } from "fumadocs-ui/components/github-info";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
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
    <RootProvider
      i18n={{
        locale,
        locales: [
          { locale: "en", name: "English" },
          { locale: "fr", name: "Français" },
        ],
      }}
      search={{ preload: false }}
      theme={{ enabled: false }}
    >
      <DocsLayout
        containerProps={{ className: "bb-docs-shell" }}
        themeSwitch={{ enabled: false }}
        sidebar={{ footer: null }}
        links={[
          {
            type: "custom" as const,
            children: (
              <GithubInfo
                className="lg:-mx-2"
                owner="naaiyy"
                repo="BaseBlocks"
                token={process.env.GITHUB_TOKEN}
              />
            ),
          },
        ]}
        nav={{
          enabled: true,
          title: "BaseBlocks",
          url: `/${locale}`,
        }}
        tree={source.getPageTree(locale)}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
