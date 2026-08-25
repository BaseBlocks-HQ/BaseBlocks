"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
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
import {
  DEFAULT_SITE_SIDEBAR_VARIANT,
  indexTree,
  projectIndexedTree,
  type PageWithChildren,
  type TreeNode,
} from "@baseblocks/domain";
import { BlurStack } from "@baseblocks/ui/blur-stack";
import { cn } from "@baseblocks/ui/lib/utils";
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
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PublicPageContent } from "./page-content";
import { buildPublishedPageTargets } from "./page-targets";
import type { PublishedPageResult } from "./read-model";
import { PublicSiteOptionsMenu } from "./site-options-menu";

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
  const renderActions = {
    siteId: site._id,
    siteSlug: site.slug,
    openPage: navigateToPage,
    publishedSurface: true,
    publishedLibraries,
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
      <SiteRenderActionsProvider actions={renderActions}>
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
                imageIds={result.imageIds}
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
            <PublicSiteOptionsMenu pageId={pageId} />
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
  const nodes = buildPublishedNavigationNodes(pages);
  const treeIndex = indexTree(nodes);
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
                <div className="relative">
                  <Link
                    aria-label={page.title}
                    className="absolute inset-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    href={getPageLink(siteSlug, page.fullPath)}
                    prefetch={false}
                  />
                  <span className="pointer-events-none relative z-10 size-7 shrink-0">
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
                        className="pointer-events-auto absolute inset-0 z-10 flex items-center justify-center text-muted-foreground opacity-0 outline-none transition-opacity duration-100 ease-[cubic-bezier(0.2,0,0,1)] hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring group-hover/page:opacity-100 pointer-coarse:opacity-100"
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
                      <span
                        aria-hidden="true"
                        className="pointer-events-none flex h-8 min-w-0 items-center overflow-hidden pr-2"
                      >
                        <MiddleTruncate
                          className="flex-1"
                          leadingRef={textRef}
                          text={page.title}
                        />
                      </span>
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
