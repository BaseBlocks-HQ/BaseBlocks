"use client";

import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { OverflowTooltip } from "@/components/tree/overflow-tooltip";
import { SearchBox } from "@/features/search";
import { getPageLink } from "@/features/published-sites/urls";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/domain";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { ChevronDown, ChevronRight, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PublicPageContent } from "./page-content";
import { buildPublishedPageTargets } from "./page-targets";
import type { PublishedPageResult } from "./read-model";
import { WordLogoIcon } from "./word-logo-icon";

interface PublicSiteShellProps {
  result: PublishedPageResult;
}

function readPreviousPageUrl(value: string | null) {
  if (!value?.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function readNavigationIcon(value: string | null) {
  if (!value || value.length > 16) return null;
  return value;
}

export function PublicSiteShell({ result }: PublicSiteShellProps) {
  const { navigation: pages, organization: team, page, site } = result;
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousPageUrl = readPreviousPageUrl(searchParams.get("from"));
  const navigationIcon = readNavigationIcon(searchParams.get("icon"));
  const pageTargets = buildPublishedPageTargets(result.pages);
  const openPage = (pageId: string) => {
    const target = pageTargets.get(pageId);
    if (!target || target.pageId === page?._id) return;
    const currentQuery = searchParams.toString();
    const currentUrl = currentQuery ? `${pathname}?${currentQuery}` : pathname;
    const targetUrl = getPageLink(site.slug, target.path);
    const targetSearchParams = new URLSearchParams({
      from: currentUrl,
      icon: target.icon ?? "📄",
    });
    router.push(`${targetUrl}?${targetSearchParams.toString()}`);
  };

  const goBack = () => {
    if (previousPageUrl) router.push(previousPageUrl);
  };

  if (!page) return null;

  const currentPath =
    result.canonicalUrlInputs.pagePath.join("/") || page.slug || "";

  return (
    <SiteThemeScope
      className="h-svh w-full overflow-hidden"
      theme={site.settings.theme}
      withPortalContainer
    >
      <SiteRenderActionsProvider
        actions={{
          siteId: site._id,
          siteSlug: site.slug,
          openPage,
          publicSearch: true,
        }}
      >
        <SidebarProvider>
          <PublicSiteSidebar
            site={site}
            team={team}
            pages={pages as PageWithChildren[] | undefined}
            currentPath={currentPath}
            siteSlug={site.slug}
          />

          <SidebarInset className="relative h-svh min-w-0 overflow-hidden bg-background [--bb-header-height:3.5rem]">
            <PublicSiteHeader
              onOpenPage={openPage}
              pageId={page.parentId ? page._id : undefined}
              site={site}
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PublicPageContent
                pageId={page._id as Id<"pages">}
                initialPage={
                  navigationIcon ? { ...page, icon: navigationIcon } : page
                }
                initialStructure={result.pageContent}
                canGoBack={previousPageUrl !== null}
                onGoBack={goBack}
                pageTargets={pageTargets}
              />
            </div>
          </SidebarInset>
        </SidebarProvider>
      </SiteRenderActionsProvider>
    </SiteThemeScope>
  );
}

function PublicSiteHeader({
  onOpenPage,
  pageId,
  site,
}: {
  site: PublishedPageResult["site"];
  pageId?: string;
  onOpenPage: (pageId: string) => void;
}) {
  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <div className="relative isolate">
        <BlurStack className="inset-x-0 top-0 h-full" direction="down" />
        <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
        <div className="relative flex h-14 items-center gap-3 px-4">
          <SidebarTrigger />
          <div className="ml-auto flex items-center gap-3">
            {pageId ? (
              <Button
                aria-label="Export as Word"
                onClick={() =>
                  window.location.assign(
                    `/api/pages/${pageId}/export?format=docx`,
                  )
                }
                size="sm"
                title="Export as Word"
                variant="ghost"
              >
                <WordLogoIcon className="size-4" />
                <span className="hidden sm:inline">Export Word</span>
              </Button>
            ) : null}
            {site.settings.showHeaderSearch === true ? (
              <SearchBox
                siteId={site._id}
                usePublicQuery
                placeholder="Search..."
                maxResults={5}
                className="w-64"
                surface="soft"
                onOpenPageResult={(pageId) => onOpenPage(pageId)}
              />
            ) : null}
            <PublicSiteThemeMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

function PublicSiteSidebar({
  currentPath,
  pages,
  site,
  siteSlug,
  team,
}: {
  site: PublishedPageResult["site"];
  team: PublishedPageResult["organization"];
  pages?: PageWithChildren[];
  currentPath: string;
  siteSlug: string;
}) {
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;

  return (
    <Sidebar>
      <SidebarHeader className="flex h-14 flex-row items-center gap-2 px-4">
        {showLogo ? <SiteLogoImage site={site} team={team} /> : null}
        {showSiteName ? (
          <span className="truncate font-semibold">{site.name}</span>
        ) : null}
      </SidebarHeader>
      <SidebarContent className="overflow-hidden p-0">
        <div className="h-full overflow-y-auto">
          <nav className="p-2">
            {pages === undefined ? (
              <div className="flex min-h-24 items-center justify-center">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : (
              <PublishedPageNavigation
                currentPath={currentPath}
                pages={pages}
                siteSlug={siteSlug}
              />
            )}
          </nav>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

function SiteLogoImage({
  site,
  team,
}: {
  site: { name: string; logoUrl?: string };
  team: { name: string; logoUrl?: string };
}) {
  const logoUrl = site.logoUrl || team.logoUrl;
  const fallbackInitial = (site.name || team.name || "S")[0]?.toUpperCase();

  if (!logoUrl) {
    return (
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        {fallbackInitial}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={`${site.name} logo`}
      className="size-8 shrink-0 rounded-lg object-contain"
      width={32}
      height={32}
      unoptimized
    />
  );
}

function PublicSiteThemeMenu() {
  const { setTheme } = useTheme();
  const t = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="relative text-muted-foreground hover:text-foreground"
          size="icon"
          variant="ghost"
        >
          <Sun className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("themeLight")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("themeDark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("themeSystem")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PublishedNavigationRow {
  depth: number;
  fullPath: string;
  hasChildren: boolean;
  isExpanded: boolean;
  page: PageWithChildren;
}

function buildPublishedNavigationRows(
  pages: PageWithChildren[],
  currentPath: string,
  expandedPages: ReadonlySet<string>,
) {
  const rows: PublishedNavigationRow[] = [];

  const visit = (siblings: PageWithChildren[], parentPath = "", depth = 0) => {
    for (const page of siblings) {
      const fullPath = parentPath ? `${parentPath}/${page.slug}` : page.slug;
      const hasChildren = page.children.length > 0;
      const isCurrentParent = currentPath.startsWith(`${fullPath}/`);
      const isExpanded = expandedPages.has(page._id) || isCurrentParent;

      rows.push({ depth, fullPath, hasChildren, isExpanded, page });
      if (hasChildren && isExpanded) {
        visit(page.children, fullPath, depth + 1);
      }
    }
  };

  visit(pages);
  return rows;
}

function PublishedPageNavigation({
  currentPath,
  pages,
  siteSlug,
}: {
  currentPath: string;
  pages: PageWithChildren[];
  siteSlug: string;
}) {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(
    () => new Set(),
  );
  const rows = buildPublishedNavigationRows(pages, currentPath, expandedPages);

  return (
    <SidebarMenu aria-label="Site pages" className="gap-0.5" role="tree">
      {rows.map(({ depth, fullPath, hasChildren, isExpanded, page }) => (
        <SidebarMenuItem
          aria-level={depth + 1}
          aria-expanded={hasChildren ? isExpanded : undefined}
          key={page._id}
          role="treeitem"
        >
          <SidebarMenuButton
            asChild
            isActive={fullPath === currentPath}
            className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-0 p-0 font-normal data-[active=true]:font-medium"
          >
            <div>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${isExpanded ? "Collapse" : "Expand"} ${page.title}`}
                  className="flex h-8 w-7 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  onClick={() => {
                    setExpandedPages((current) => {
                      const next = new Set(current);
                      if (next.has(page._id)) next.delete(page._id);
                      else next.add(page._id);
                      return next;
                    });
                  }}
                >
                  {isExpanded ? (
                    <ChevronDown className="size-3.5" />
                  ) : (
                    <ChevronRight className="size-3.5" />
                  )}
                </button>
              ) : (
                <span className="h-8 w-7" />
              )}
              <OverflowTooltip content={page.title}>
                {(textRef) => (
                  <Link
                    className="flex h-8 min-w-0 items-center overflow-hidden pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    href={getPageLink(siteSlug, fullPath)}
                  >
                    <span ref={textRef} className="min-w-0 truncate">
                      {page.title}
                    </span>
                  </Link>
                )}
              </OverflowTooltip>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
