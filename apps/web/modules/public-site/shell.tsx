"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { usePageAncestors } from "@/lib/data";
import { getPageLink } from "@/lib/url";
import { cn } from "@/lib/utils";
import { usePageExpandState } from "@/lib/use-page-expand-state";
import { SearchBox } from "@/modules/site-search";
import { SiteRenderActionsProvider } from "@/modules/site-runtime/actions";
import { useCustomizationStyles } from "@/modules/site-runtime/customization";
import { usePagePanelState } from "@/modules/site-runtime/page-panel-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { PageWithChildren } from "@baseblocks/domain";
import type { SiteCustomization } from "@baseblocks/domain/site-settings";
import type { NavigationStyle } from "@baseblocks/domain/site-settings";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@baseblocks/ui/sidebar";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Home,
  Moon,
  Sun,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import { PublicPageContent } from "./page-content";
import { IconFile } from "nucleo-glass";

interface PublicSiteShellProps {
  site: {
    _id: Id<"sites">;
    name: string;
    slug: string;
    logoUrl?: string;
    settings: {
      navigationStyle: NavigationStyle;
      headerType: string;
      showHeader?: boolean;
      showLogo?: boolean;
      showSiteName?: boolean;
      showHeaderSearch?: boolean;
      showBreadcrumbs?: boolean;
      sidebarDefaultExpanded?: boolean;
      customization?: SiteCustomization;
    };
  };
  team: {
    name: string;
    slug: string;
    logoUrl?: string;
    settings: { primaryColor?: string };
  };
  pagePath: string[];
}

export function PublicSiteShell({
  site,
  team,
  pagePath,
}: PublicSiteShellProps) {
  const pagePanel = usePagePanelState();
  const sessionTokens = getStoredAccessSessionTokens();
  const pagesRaw = useQuery(api.pages.queries.getTreePublished, {
    siteId: site._id,
    sessionTokens,
  });
  const pages = pagesRaw as PageWithChildren[] | undefined;

  const currentPage = useQuery(api.pages.queries.getByPathPublished, {
    siteId: site._id,
    path: pagePath,
    sessionTokens,
  });
  const currentPageStatus = useQuery(
    api.pages.queries.getByPathPublishedStatus,
    {
      siteId: site._id,
      path: pagePath,
      sessionTokens,
    },
  );

  const ancestors = useQuery(
    api.pages.queries.getAncestors,
    currentPage?._id ? { pageId: currentPage._id as Id<"pages"> } : "skip",
  );

  const ancestorIds = ancestors?.map((a) => a._id) ?? [];
  const currentPathString =
    pagePath.length > 0 ? pagePath.join("/") : (currentPage?.slug ?? "");

  if (
    pagePath.length === 0 &&
    currentPage === null &&
    pages &&
    pages.length > 0
  ) {
    const firstPage = pages[0];
    if (firstPage) {
      redirect(getPageLink(site.slug, firstPage.slug));
    }
  }

  const showHeader = site.settings.showHeader !== false;
  const sidebarDefaultExpanded = site.settings.sidebarDefaultExpanded === true;
  const navigationStyle = site.settings.navigationStyle;
  const showBreadcrumbs =
    site.settings.showBreadcrumbs ?? navigationStyle !== "sidebar";

  const customizationStyles = useCustomizationStyles(
    site.settings.customization,
  );
  const isCustomized = !!(
    site.settings.customization?.accentColor ||
    site.settings.customization?.headerColor ||
    site.settings.customization?.secondaryColor ||
    site.settings.customization?.borderRadius
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isCustomized) {
      root.setAttribute("data-site-customized", "");
      for (const [key, value] of Object.entries(customizationStyles)) {
        if (key.startsWith("--")) {
          root.style.setProperty(key, value as string);
        }
      }
    }
    return () => {
      root.removeAttribute("data-site-customized");
      for (const key of Object.keys(customizationStyles)) {
        if (key.startsWith("--")) {
          root.style.removeProperty(key);
        }
      }
    };
  }, [customizationStyles, isCustomized]);

  const showSidebar = navigationStyle === "sidebar";

  const mainContent = (
    <>
      {showHeader && (
        <PublicSiteHeader
          site={site}
          team={team}
          pages={pages}
          currentPath={currentPathString}
          onOpenPage={pagePanel.openPage}
        />
      )}

      {!showSidebar &&
        site.settings.customization?.showHeaderGradient &&
        showHeader && (
          <div className="relative z-30">
            <GradientStripe customization={site.settings.customization} />
          </div>
        )}

      <PublicSiteMainContent
        currentPage={
          currentPage
            ? {
                _id: currentPage._id as string,
                title: currentPage.title,
              }
            : currentPage
        }
        currentPageStatus={currentPageStatus?.status}
        pages={pages}
        currentPath={currentPathString}
        siteSlug={site.slug}
        navigationStyle={navigationStyle}
        showBreadcrumbs={showBreadcrumbs}
      />
    </>
  );

  return (
    <SiteRenderActionsProvider
      actions={{
        siteId: site._id,
        siteSlug: site.slug,
        teamSlug: team.slug,
        openPage: pagePanel.openPage,
        publicSearch: true,
        fileDeepLinks: true,
      }}
    >
      {showSidebar ? (
        <SidebarProvider>
          {site.settings.customization?.showHeaderGradient && showHeader && (
            <div className="fixed top-14 left-0 right-0 z-30">
              <GradientStripe customization={site.settings.customization} />
            </div>
          )}
          <div
            className="h-screen bg-background flex overflow-hidden w-full"
            style={customizationStyles}
            {...(isCustomized ? { "data-site-customized": "" } : {})}
          >
            <PublicSiteSidebar
              site={site}
              team={team}
              pages={pages}
              currentPath={currentPathString}
              ancestorIds={ancestorIds}
              sidebarDefaultExpanded={sidebarDefaultExpanded}
              siteId={site._id}
              siteSlug={site.slug}
            />

            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {mainContent}
            </main>
          </div>
        </SidebarProvider>
      ) : (
        <div
          className="h-screen bg-background flex flex-col overflow-hidden"
          style={customizationStyles}
          {...(isCustomized ? { "data-site-customized": "" } : {})}
        >
          {mainContent}
        </div>
      )}
    </SiteRenderActionsProvider>
  );
}

function PublicSiteHeader({
  currentPath,
  onOpenPage,
  pages,
  site,
  team,
}: {
  site: PublicSiteShellProps["site"];
  team: PublicSiteShellProps["team"];
  pages?: PageWithChildren[];
  currentPath: string;
  onOpenPage: (pageId: string, options?: { searchTerm?: string }) => void;
}) {
  const showSidebar = site.settings.navigationStyle === "sidebar";
  const showTopNav = site.settings.navigationStyle === "topnav";
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const showHeaderSearch = site.settings.showHeaderSearch === true;
  const hasCustomHeaderColor = !!site.settings.customization?.headerColor;
  const themeButtonClassName = hasCustomHeaderColor
    ? "text-current hover:bg-current/10"
    : undefined;

  return (
    <header
      className={cn(
        "relative shrink-0 z-40",
        !site.settings.customization?.headerColor &&
          "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
      )}
      style={
        site.settings.customization?.headerColor
          ? {
              backgroundColor: "var(--site-header-bg)",
              color: "var(--site-header-fg)",
            }
          : undefined
      }
    >
      <div className="flex h-14 items-center px-4">
        {showSidebar ? (
          <CollapsedSidebarTrigger
            triggerClassName={
              hasCustomHeaderColor
                ? "text-current hover:bg-current/10"
                : undefined
            }
          />
        ) : (
          <div className="flex items-center gap-2">
            {showLogo && <SiteLogoImage site={site} team={team} />}
            {showSiteName && <span className="font-semibold">{site.name}</span>}
          </div>
        )}

        {showTopNav && pages && (
          <div className="flex-1 flex justify-center ml-8">
            <TopNavMenu
              pages={pages}
              currentPath={currentPath}
              siteSlug={site.slug}
            />
          </div>
        )}

        <div className="flex items-center gap-3 ml-auto">
          {showHeaderSearch && (
            <SearchBox
              siteId={site._id}
              usePublicQuery
              placeholder="Search..."
              maxResults={5}
              className="w-64"
              headerMode={hasCustomHeaderColor}
              onOpenPageResult={(pageId, searchTerm) =>
                onOpenPage(pageId, { searchTerm })
              }
            />
          )}
          <PublicSiteThemeMenu className={themeButtonClassName} />
        </div>
      </div>
    </header>
  );
}

function PublicSiteSidebar({
  ancestorIds,
  currentPath,
  pages,
  sidebarDefaultExpanded,
  site,
  siteId,
  siteSlug,
  team,
}: {
  site: PublicSiteShellProps["site"];
  team: PublicSiteShellProps["team"];
  pages?: PageWithChildren[];
  currentPath: string;
  ancestorIds: string[];
  sidebarDefaultExpanded: boolean;
  siteId: Id<"sites">;
  siteSlug: string;
}) {
  const showLogo = site.settings.showLogo !== false;
  const showSiteName = site.settings.showSiteName !== false;
  const hasCustomHeaderColor = !!site.settings.customization?.headerColor;

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0">
      <SidebarHeader
        className="h-14 px-4 flex flex-row items-center gap-2"
        style={
          site.settings.customization?.headerColor
            ? {
                backgroundColor: "var(--site-header-bg)",
                color: "var(--site-header-fg)",
              }
            : undefined
        }
      >
        {showLogo && <SiteLogoImage site={site} team={team} />}
        {showSiteName && (
          <span className="font-semibold truncate">{site.name}</span>
        )}
        <SidebarTrigger
          className={cn(
            "ml-auto",
            hasCustomHeaderColor && "text-current hover:bg-current/10",
          )}
        />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden p-0">
        <ScrollArea className="h-full">
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
                  ancestorIds={ancestorIds}
                  defaultExpanded={sidebarDefaultExpanded}
                  siteId={siteId}
                  siteSlug={siteSlug}
                />
              ))
            )}
          </nav>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}

function PublicSiteMainContent({
  currentPage,
  currentPageStatus,
  currentPath,
  navigationStyle,
  pages,
  showBreadcrumbs,
  siteSlug,
}: {
  currentPage: { _id: string; title: string } | null | undefined;
  currentPageStatus?: "accessible" | "forbidden" | "missing";
  pages?: PageWithChildren[];
  currentPath: string;
  navigationStyle: NavigationStyle;
  showBreadcrumbs: boolean;
  siteSlug: string;
}) {
  const showSubNav = navigationStyle === "subnav";

  return (
    <>
      {showSubNav && pages && (
        <SubNavBar
          pages={pages}
          currentPath={currentPath}
          siteSlug={siteSlug}
          className="sticky top-14 z-30"
        />
      )}

      {showBreadcrumbs && currentPage && (
        <BreadcrumbBar
          pageId={currentPage._id as Id<"pages">}
          pageTitle={currentPage.title}
          siteSlug={siteSlug}
          className={cn("sticky z-20", showSubNav ? "top-24" : "top-14")}
        />
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {currentPage === undefined ? (
          <div className="flex flex-1 items-center justify-center p-8">
            <Spinner className="size-6 text-muted-foreground" />
          </div>
        ) : currentPage === null ? (
          <div className="flex flex-1 items-center justify-center p-8">
            {currentPageStatus === "forbidden" ? (
              <div className="mx-auto max-w-md space-y-4 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">
                  This page is restricted
                </h2>
                <p className="text-muted-foreground">
                  You must have access to view this page.
                </p>
                <Button asChild>
                  <Link href="/login" target="_blank" rel="noreferrer">
                    Log in
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mx-auto max-w-md text-center">
                <p className="text-muted-foreground">Page not found</p>
              </div>
            )}
          </div>
        ) : (
          <PublicPageContent pageId={currentPage._id as Id<"pages">} />
        )}
      </div>
    </>
  );
}

export function GradientStripe({
  customization,
}: {
  customization: SiteCustomization;
}) {
  const primaryColor = customization.accentColor || "#0066FF";
  const gradientStops = [primaryColor];

  if (customization.tertiaryColor) {
    gradientStops.push(customization.tertiaryColor);
  }

  if (customization.secondaryColor) {
    gradientStops.push(customization.secondaryColor);
  }

  const gradient =
    gradientStops.length >= 2
      ? `linear-gradient(to right, ${gradientStops.join(", ")})`
      : primaryColor;

  return (
    <div
      className="h-1 w-full flex-shrink-0"
      style={{ background: gradient }}
    />
  );
}

function CollapsedSidebarTrigger({
  triggerClassName,
}: {
  triggerClassName?: string;
}) {
  const { open } = useSidebar();

  if (open) {
    return null;
  }

  return <SidebarTrigger className={triggerClassName} />;
}

function SiteLogoImage({
  site,
  team,
}: {
  site: { name: string; logoUrl?: string };
  team: { name: string; logoUrl?: string; settings: { primaryColor?: string } };
}) {
  const logoUrl = site.logoUrl || team.logoUrl;
  const fallbackInitial = (site.name || team.name || "S")[0]?.toUpperCase();

  if (!logoUrl) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
        {fallbackInitial}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={`${site.name} logo`}
      className="h-8 w-8 shrink-0 rounded-lg object-contain"
      width={32}
      height={32}
      unoptimized
    />
  );
}

function PublicSiteThemeMenu({ className }: { className?: string }) {
  const { setTheme } = useTheme();
  const t = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "relative text-muted-foreground hover:text-foreground",
            className,
          )}
          size="icon"
          variant="ghost"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
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

function TopNavMenu({
  className,
  currentPath,
  pages,
  siteSlug,
}: {
  pages: PageWithChildren[];
  currentPath?: string;
  className?: string;
  siteSlug: string;
}) {
  return (
    <nav className={cn("flex items-center gap-1", className)}>
      {pages.map((page) => (
        <HorizontalNavItem
          key={page._id}
          page={page}
          currentPath={currentPath}
          siteSlug={siteSlug}
          variant="topnav"
        />
      ))}
    </nav>
  );
}

function SubNavBar({
  className,
  currentPath,
  pages,
  siteSlug,
}: {
  pages: PageWithChildren[];
  currentPath?: string;
  className?: string;
  siteSlug: string;
}) {
  return (
    <nav
      className={cn(
        "border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-10 items-center gap-1">
          {pages.map((page) => (
            <HorizontalNavItem
              key={page._id}
              page={page}
              currentPath={currentPath}
              siteSlug={siteSlug}
              variant="tabbar"
            />
          ))}
        </div>
      </div>
    </nav>
  );
}

function HorizontalNavItem({
  currentPath,
  page,
  siteSlug,
  variant,
}: {
  page: PageWithChildren;
  currentPath?: string;
  siteSlug: string;
  variant: "topnav" | "tabbar";
}) {
  const hasChildren = page.children && page.children.length > 0;
  const fullPath = page.slug;
  const isActive = currentPath === fullPath;
  const isParentOfActive = currentPath?.startsWith(`${fullPath}/`);
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"left" | "right">(
    "left",
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDropdownPosition = () => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const dropdownWidth = 220;
    const shouldAlignRight = rect.left + dropdownWidth > window.innerWidth - 20;
    setDropdownPosition(shouldAlignRight ? "right" : "left");
  };

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    updateDropdownPosition();
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerStyles = cn(
    "inline-flex items-center gap-1 text-sm font-medium transition-colors rounded-md",
    "hover:text-foreground",
    isActive || isParentOfActive ? "text-foreground" : "text-muted-foreground",
    variant === "topnav" && "px-4 py-2 hover:bg-accent",
    variant === "tabbar" && [
      "px-3 py-2",
      "relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5",
      (isActive || isParentOfActive) && "after:bg-primary",
    ],
  );

  if (!hasChildren) {
    return (
      <Link href={getPageLink(siteSlug, fullPath)} className={triggerStyles}>
        {page.title}
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={getPageLink(siteSlug, fullPath)} className={triggerStyles}>
        {page.title}
        <ChevronDown
          className={cn(
            "h-3 w-3 transition-transform duration-200",
            isOpen && "rotate-180",
          )}
        />
      </Link>

      {isOpen && (
        <div
          className={cn(
            "absolute top-full pt-1 z-50",
            dropdownPosition === "left" ? "left-0" : "right-0",
          )}
        >
          <div className="w-[220px] rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
            <DropdownNavTree
              page={page}
              currentPath={currentPath}
              siteSlug={siteSlug}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownNavTree({
  currentPath,
  depth = 0,
  page,
  pagePath,
  siteSlug,
}: {
  page: PageWithChildren;
  currentPath?: string;
  depth?: number;
  pagePath?: string;
  siteSlug: string;
}) {
  const hasChildren = page.children && page.children.length > 0;
  const fullPath = pagePath ? `${pagePath}/${page.slug}` : page.slug;
  const isActive = currentPath === fullPath;
  const isParentOfActive = currentPath?.startsWith(`${fullPath}/`);
  const [isExpanded, setIsExpanded] = useState(isParentOfActive);

  const handleToggleExpand = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsExpanded((value) => !value);
  };

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-1 py-1.5 rounded-md text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px`, paddingRight: "8px" }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="h-5 w-5 flex items-center justify-center shrink-0 hover:bg-accent rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="w-5" />
        )}

        <Link
          href={getPageLink(siteSlug, fullPath)}
          className="flex-1 flex items-center gap-2"
        >
          <FileText className="h-4 w-4 shrink-0" />
          <span className="truncate">{page.title}</span>
        </Link>
      </div>

      {hasChildren &&
        isExpanded &&
        page.children.map((child) => (
          <DropdownNavTree
            key={child._id}
            page={child}
            currentPath={currentPath}
            pagePath={fullPath}
            siteSlug={siteSlug}
            depth={depth + 1}
          />
        ))}
    </>
  );
}

const EMPTY_ANCESTOR_IDS: string[] = [];
const EXPANDED_PAGES_KEY = "baseblocks_expanded_pages";

function NavItem({
  ancestorIds = EMPTY_ANCESTOR_IDS,
  currentPath,
  defaultExpanded,
  depth = 0,
  page,
  pagePath,
  siteId,
  siteSlug,
}: {
  page: PageWithChildren;
  currentPath?: string;
  depth?: number;
  ancestorIds?: string[];
  pagePath?: string;
  defaultExpanded?: boolean;
  siteId: Id<"sites">;
  siteSlug: string;
}) {
  const hasChildren = page.children && page.children.length > 0;
  const fullPath = pagePath ? `${pagePath}/${page.slug}` : page.slug;
  const isActive = fullPath === currentPath;
  const shouldAutoExpand = ancestorIds.includes(page._id);
  const {
    isExpanded: isExpandedFromStorage,
    toggleExpand,
    setExpanded,
  } = usePageExpandState(EXPANDED_PAGES_KEY, siteId);
  const isExpanded = isExpandedFromStorage(page._id);

  useEffect(() => {
    if ((shouldAutoExpand || (defaultExpanded && hasChildren)) && !isExpanded) {
      setExpanded(page._id, true);
    }
  }, [
    shouldAutoExpand,
    defaultExpanded,
    hasChildren,
    isExpanded,
    setExpanded,
    page._id,
  ]);

  const handleToggleExpand = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    toggleExpand(page._id);
  };

  return (
    <>
      <Link
        href={getPageLink(siteSlug, fullPath)}
        className={`flex items-center gap-1 px-1 py-1 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
        style={{ paddingLeft: `${(depth + 1) * 9}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
            onClick={handleToggleExpand}
            className="h-3 w-3 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <ChevronDown className="h-2.5 w-2.5" />
            ) : (
              <ChevronRight className="h-2.5 w-2.5" />
            )}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <IconFile className="h-4 w-4" />
        {page.title}
      </Link>

      {hasChildren &&
        isExpanded &&
        page.children.map((child) => (
          <NavItem
            key={child._id}
            page={child}
            currentPath={currentPath}
            depth={depth + 1}
            ancestorIds={ancestorIds}
            pagePath={fullPath}
            defaultExpanded={defaultExpanded}
            siteId={siteId}
            siteSlug={siteSlug}
          />
        ))}
    </>
  );
}

function BreadcrumbBar({
  className,
  pageId,
  pageTitle,
  siteSlug,
}: {
  pageId: Id<"pages">;
  pageTitle: string;
  className?: string;
  siteSlug: string;
}) {
  const ancestors = usePageAncestors(pageId);

  const breadcrumbItems = (() => {
    if (!ancestors) return [];

    const items: Array<{
      _id: string;
      title: string;
      path: string;
    }> = [];

    let currentPath = "";

    for (const ancestor of ancestors) {
      currentPath = currentPath
        ? `${currentPath}/${ancestor.slug}`
        : ancestor.slug;
      items.push({
        _id: ancestor._id,
        title: ancestor.title,
        path: currentPath,
      });
    }

    return items;
  })();

  if (ancestors === undefined || ancestors.length === 0) {
    return null;
  }

  return (
    <nav className={cn("border-b bg-muted/30", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-8 items-center">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link
                href={getPageLink(siteSlug, "home")}
                className="flex items-center hover:text-foreground transition-colors"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="sr-only">Home</span>
              </Link>
            </li>
            <li>
              <ChevronRight className="h-3.5 w-3.5" />
            </li>

            {breadcrumbItems.map((item) => (
              <Fragment key={item._id}>
                <li>
                  <Link
                    href={getPageLink(siteSlug, item.path)}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.title}
                  </Link>
                </li>
                <li>
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
              </Fragment>
            ))}

            <li className="text-foreground font-medium truncate max-w-[200px]">
              {pageTitle}
            </li>
          </ol>
        </div>
      </div>
    </nav>
  );
}
