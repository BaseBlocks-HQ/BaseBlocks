"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  File01Icon,
  LanguageCircleIcon,
  MoonIcon,
  Sun01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { SiteRenderActionsProvider } from "@/components/site-runtime/actions";
import { SiteThemeScope } from "@/components/site-runtime/site-theme-scope";
import { OverflowTooltip } from "@/components/tree/overflow-tooltip";
import { MiddleTruncate } from "@/components/tree/middle-truncate";
import {
  AnimatedTreeRow,
  AnimatedTreeRows,
} from "@/components/tree/animated-tree";
import { useTreeDisclosure } from "@/components/tree/use-tree-disclosure";
import { SearchBox } from "@/features/search";
import { getPageLink } from "@/features/published-sites/urls";
import type { Locale } from "@baseblocks/i18n";
import {
  DEFAULT_SITE_SIDEBAR_VARIANT,
  indexTree,
  projectIndexedTree,
  type PageWithChildren,
  type TreeNode,
} from "@baseblocks/domain";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
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
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
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
  const pageTargets = buildPublishedPageTargets(result.navigation);
  const publishedLibraries = Object.fromEntries(
    result.libraries.map((library) => [library.library._id, library]),
  );
  const navigateToPage = (pageId: string) => {
    const target = pageTargets.get(pageId);
    if (!target || target.pageId === page?._id) return;
    router.push(getPageLink(site.slug, target.path));
  };
  const openPageBlock = (pageId: string) => {
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
          openPage: navigateToPage,
          publishedSurface: true,
          publishedLibraries,
        }}
      >
        <SidebarProvider cookieName={null}>
          <PublicSiteSidebar
            site={site}
            team={team}
            pages={pages as PageWithChildren[] | undefined}
            currentPath={currentPath}
            siteSlug={site.slug}
          />

          <SidebarInset className="relative h-svh min-w-0 overflow-hidden bg-background [--bb-header-height:3.5rem]">
            <PublicSiteHeader
              onOpenPage={navigateToPage}
              pageId={page.isOpenEditorPageBlock ? page._id : undefined}
              site={site}
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PublicPageContent
                key={page._id}
                page={navigationIcon ? { ...page, icon: navigationIcon } : page}
                content={result.content}
                canGoBack={previousPageUrl !== null}
                onGoBack={goBack}
                onOpenPageBlock={openPageBlock}
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
              <div className="flex items-center gap-1">
                <Button
                  aria-label="Export as Word"
                  onClick={() =>
                    window.location.assign(
                      `/api/pages/${pageId}/export?format=docx`,
                    )
                  }
                  size="sm"
                  title="Export as Word"
                  type="button"
                  variant="ghost"
                >
                  <WordLogoIcon className="size-4" />
                  <span className="hidden sm:inline">Export Word</span>
                </Button>
                <Button
                  aria-label="Export as Markdown"
                  onClick={() =>
                    window.location.assign(
                      `/api/pages/${pageId}/export?format=markdown`,
                    )
                  }
                  size="sm"
                  title="Export as Markdown"
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon icon={File01Icon} />
                  <span className="hidden sm:inline">Export Markdown</span>
                </Button>
              </div>
            ) : null}
            {site.settings.showHeaderSearch === true ? (
              <SearchBox
                siteId={site._id}
                publishedMode
                placeholder="Search..."
                maxResults={5}
                className="w-64"
                surface="soft"
                onOpenPageResult={(pageId) => onOpenPage(pageId)}
              />
            ) : null}
            <PublicSiteLanguageMenu />
            <PublicSiteThemeMenu />
          </div>
        </div>
      </div>
    </header>
  );
}

function publicLocalePath(pathname: string, locale: Locale) {
  const localePattern = /^\/(en|fr)(?=\/|$)/;
  const unprefixed = pathname.replace(localePattern, "") || "/";
  return locale === "en" ? unprefixed : `/fr${unprefixed}`;
}

function PublicSiteLanguageMenu() {
  const locale = useLocale() as Locale;
  const t = useTranslations("language");

  const selectLocale = (selection: Locale | "browser") => {
    if (selection === "browser") {
      // biome-ignore lint/suspicious/noDocumentCookie: NEXT_LOCALE is also read by the edge proxy.
      document.cookie = "NEXT_LOCALE=; Path=/; Max-Age=0; SameSite=Lax";
    } else {
      // biome-ignore lint/suspicious/noDocumentCookie: NEXT_LOCALE is also read by the edge proxy.
      document.cookie = `NEXT_LOCALE=${selection}; Path=/; Max-Age=31536000; SameSite=Lax`;
    }
    window.location.assign(
      selection === "browser"
        ? publicLocalePath(window.location.pathname, "en")
        : publicLocalePath(window.location.pathname, selection),
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t("select")}
          className="text-muted-foreground hover:text-foreground"
          size="icon"
          variant="ghost"
        >
          <HugeiconsIcon icon={LanguageCircleIcon} className="size-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => selectLocale("browser")}>
          <span className="flex-1">{t("browserDefault")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => selectLocale("en")}>
          <span className="flex-1">{t("english")}</span>
          {locale === "en" ? (
            <HugeiconsIcon icon={Tick01Icon} className="size-4" />
          ) : null}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => selectLocale("fr")}>
          <span className="flex-1">{t("french")}</span>
          {locale === "fr" ? (
            <HugeiconsIcon icon={Tick01Icon} className="size-4" />
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
    <Sidebar
      variant={site.settings.sidebarVariant ?? DEFAULT_SITE_SIDEBAR_VARIANT}
    >
      <SidebarHeader className="flex h-14 flex-row items-center gap-2 px-4">
        {showLogo ? <SiteLogoImage site={site} team={team} /> : null}
        {showSiteName ? (
          <span className="truncate font-semibold">{site.name}</span>
        ) : null}
      </SidebarHeader>
      <SidebarContent className="overflow-hidden p-0">
        <div className="h-full overflow-y-auto [scrollbar-gutter:stable]">
          <nav className="p-2">
            {pages === undefined ? (
              <div className="flex min-h-24 items-center justify-center">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : (
              <PublishedPageNavigation
                currentPath={currentPath}
                expandByDefault={
                  site.settings.expandNavigationByDefault === true
                }
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
          <HugeiconsIcon
            icon={Sun01Icon}
            className="size-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <HugeiconsIcon
            icon={MoonIcon}
            className="absolute size-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
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

type PublishedNavigationItem = PageWithChildren & {
  fullPath: string;
};

function buildPublishedNavigationNodes(
  pages: PageWithChildren[],
): TreeNode<PublishedNavigationItem>[] {
  const nodes: TreeNode<PublishedNavigationItem>[] = [];

  const visit = (
    siblings: PageWithChildren[],
    parentId: string | null,
    parentPath = "",
  ) => {
    siblings.forEach((page, order) => {
      const fullPath = parentPath ? `${parentPath}/${page.slug}` : page.slug;
      nodes.push({
        id: page._id,
        parentId,
        label: page.title,
        order,
        data: { ...page, fullPath },
      });
      visit(page.children, page._id, fullPath);
    });
  };

  visit(pages, null);
  return nodes;
}

function PublishedPageNavigation({
  currentPath,
  expandByDefault,
  pages,
  siteSlug,
}: {
  currentPath: string;
  expandByDefault: boolean;
  pages: PageWithChildren[];
  siteSlug: string;
}) {
  const nodes = useMemo(() => buildPublishedNavigationNodes(pages), [pages]);
  const treeIndex = useMemo(() => indexTree(nodes), [nodes]);
  const selectedPageId = nodes.find(
    (node) => node.data.fullPath === currentPath,
  )?.id;
  const defaultExpandedIds = expandByDefault
    ? nodes
        .filter(
          (node) =>
            (treeIndex.childrenByParentId.get(node.id)?.length ?? 0) > 0,
        )
        .map((node) => node.id)
    : [];
  const disclosure = useTreeDisclosure(
    treeIndex,
    selectedPageId,
    defaultExpandedIds,
  );
  const rows = projectIndexedTree(treeIndex, disclosure.expandedIds);

  return (
    <SidebarMenu aria-label="Site pages" className="gap-0" role="tree">
      <AnimatedTreeRows>
        {rows.map(({ data: page, depth, hasChildren, id }) => {
          const isExpanded = disclosure.expandedIds.has(id);
          return (
            <AnimatedTreeRow
              aria-level={depth + 1}
              aria-expanded={hasChildren ? isExpanded : undefined}
              className="group/page"
              contentClassName="pb-0.5"
              key={id}
              role="treeitem"
            >
              <SidebarMenuButton
                asChild
                isActive={page.fullPath === currentPath}
                style={{ paddingInlineStart: `${depth * 0.75}rem` }}
                className="flex h-8 min-w-0 gap-0 p-0 font-normal data-[active=true]:font-medium"
              >
                <div>
                  <span className="relative size-7 shrink-0">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute inset-0 flex items-center justify-center text-sm leading-none transition-opacity duration-100 ease-[cubic-bezier(0.2,0,0,1)]",
                        hasChildren &&
                          "group-hover/page:opacity-0 group-has-[button[data-page-disclosure]:focus-visible]/page:opacity-0 pointer-coarse:opacity-0",
                      )}
                    >
                      {page.icon ?? "📄"}
                    </span>
                    {hasChildren ? (
                      <button
                        type="button"
                        aria-label={`${isExpanded ? "Collapse" : "Expand"} ${page.title}`}
                        className="absolute inset-0 z-10 flex items-center justify-center text-muted-foreground opacity-0 outline-none transition-opacity duration-100 ease-[cubic-bezier(0.2,0,0,1)] hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-hover/page:opacity-100 pointer-coarse:opacity-100"
                        data-page-disclosure
                        onClick={() => {
                          disclosure.toggle(id);
                        }}
                      >
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          className={cn(
                            "size-3.5 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                            isExpanded && "rotate-90",
                          )}
                        />
                      </button>
                    ) : null}
                  </span>
                  <OverflowTooltip content={page.title}>
                    {(textRef) => (
                      <Link
                        className="flex h-8 min-w-0 items-center overflow-hidden pr-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        href={getPageLink(siteSlug, page.fullPath)}
                        prefetch={false}
                      >
                        <MiddleTruncate
                          className="flex-1"
                          leadingRef={textRef}
                          text={page.title}
                        />
                      </Link>
                    )}
                  </OverflowTooltip>
                </div>
              </SidebarMenuButton>
            </AnimatedTreeRow>
          );
        })}
      </AnimatedTreeRows>
    </SidebarMenu>
  );
}
