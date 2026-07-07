import { routing } from "@/i18n/routing";
import { getLegalSource } from "@/lib/legal-source";
import type { Locale } from "@baseblocks/i18n";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LegalSectionLayout({
  children,
  params,
}: LayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  const legalSource = getLegalSource(locale as Locale);

  return (
    <RootProvider
      i18n={{
        locale,
        locales: [
          { locale: "en", name: "English" },
          { locale: "fr", name: "Français" },
        ],
      }}
      theme={{ enabled: false }}
    >
      <DocsLayout
        containerProps={{ className: "bb-docs-shell" }}
        searchToggle={{ enabled: false }}
        themeSwitch={{ enabled: false }}
        sidebar={{ footer: null }}
        nav={{
          enabled: true,
          title: "BaseBlocks",
          url: `/${locale}`,
        }}
        tree={legalSource.getPageTree()}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
