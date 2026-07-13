"use client";

import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { usePageExpandState } from "@/components/site-runtime/page-expand-state";
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
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { ChevronDown, ChevronRight, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import { IconFile } from "nucleo-glass";
import { PublicPageContent } from "./page-content";
import { buildPublishedPageTargets } from "./page-targets";
import type { PublishedPageResult } from "./read-model";
import { WordLogoIcon } from "./word-logo-icon";

interface PublicSiteShellProps {
  result: PublishedPageResult;
}

export function PublicSiteShell({ result }: PublicSiteShellProps) {
  const { navigation: pages, organization: team, page, site } = result;
  const router = useRouter();
  const pageTargets = useMemo(
    () => buildPublishedPageTargets(result.pages),
    [result.pages],
  );
  const openPage = useCallback(
    (pageId: string) => {
      const target = pageTargets.get(pageId);
      if (target) router.push(getPageLink(site.slug, target.path));
    },
    [pageTargets, router, site.slug],
  );

  if (!page) return null;

  const currentPath =
    result.canonicalUrlInputs.pagePath.join("/") || page.slug || "";

  return (
    <SiteRenderActionsProvider
      actions={{
        siteId: site._id,
        siteSlug: site.slug,
        teamSlug: team.slug,
        openPage,
        publicSearch: true,
        fileDeepLinks: true,
      }}
    >
      <SidebarProvider>
        <PublicSiteSidebar
          site={site}
          team={team}
          pages={pages as PageWithChildren[] | undefined}
          currentPath={currentPath}
          siteId={site._id}
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
              initialPage={page}
              initialStructure={result.pageContent}
              pageTargets={pageTargets}
            />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </SiteRenderActionsProvider>
  );
}

function PublicSiteHeader({
  onOpenPage,
  pageId,
  site,
}: {
  site: PublishedPageResult["site"];
  pageId?: string;
  onOpenPage: (pageId: string, options?: { searchTerm?: string }) => void;
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
                onOpenPageResult={(pageId, searchTerm) =>
                  onOpenPage(pageId, { searchTerm })
                }
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
  siteId,
  siteSlug,
  team,
}: {
  site: PublishedPageResult["site"];
  team: PublishedPageResult["organization"];
  pages?: PageWithChildren[];
  currentPath: string;
  siteId: Id<"sites">;
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
          <nav className="space-y-0.5 p-2.5">
            {pages === undefined ? (
              <div className="flex min-h-24 items-center justify-center">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : (
              pages.map((page) => (
                <NavItem
                  key={page._id}
                  page={page}
                  currentPath={currentPath}
                  siteId={siteId}
                  siteSlug={siteSlug}
                />
              ))
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

const EXPANDED_PAGES_KEY = "baseblocks_expanded_pages";

function NavItem({
  currentPath,
  depth = 0,
  page,
  pagePath,
  siteId,
  siteSlug,
}: {
  page: PageWithChildren;
  currentPath?: string;
  depth?: number;
  pagePath?: string;
  siteId: Id<"sites">;
  siteSlug: string;
}) {
  const hasChildren = page.children.length > 0;
  const fullPath = pagePath ? `${pagePath}/${page.slug}` : page.slug;
  const isActive = fullPath === currentPath;
  const shouldAutoExpand = currentPath?.startsWith(`${fullPath}/`) === true;
  const {
    isExpanded: readExpanded,
    toggleExpand,
    setExpanded,
  } = usePageExpandState(EXPANDED_PAGES_KEY, siteId);
  const isExpanded = readExpanded(page._id);

  useEffect(() => {
    if (shouldAutoExpand && hasChildren && !isExpanded) {
      setExpanded(page._id, true);
    }
  }, [hasChildren, isExpanded, page._id, setExpanded, shouldAutoExpand]);

  return (
    <>
      <Link
        href={getPageLink(siteSlug, fullPath)}
        className={cn(
          "flex items-center gap-1 rounded-md px-1 py-1 text-sm transition-colors",
          isActive
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        style={{ paddingLeft: `${(depth + 1) * 9}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleExpand(page._id);
            }}
            className="flex size-3 shrink-0 cursor-pointer items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          >
            {isExpanded ? (
              <ChevronDown className="size-2.5" />
            ) : (
              <ChevronRight className="size-2.5" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <IconFile className="size-4 shrink-0" />
        <span className="truncate">{page.title}</span>
      </Link>

      {hasChildren && isExpanded
        ? page.children.map((child) => (
            <NavItem
              key={child._id}
              page={child}
              currentPath={currentPath}
              depth={depth + 1}
              pagePath={fullPath}
              siteId={siteId}
              siteSlug={siteSlug}
            />
          ))
        : null}
    </>
  );
}
