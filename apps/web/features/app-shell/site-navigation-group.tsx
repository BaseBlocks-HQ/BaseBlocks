"use client";

import { AnimatedDisclosure } from "@/components/tree/animated-tree";
import { MiddleTruncate } from "@/components/tree/middle-truncate";
import {
  appSidebarIconSlotClassName,
  appSidebarRowClassName,
  appSidebarRowGapClassName,
} from "@/features/app-shell/app-sidebar-row";
import { getTeamSiteEditorPath } from "@/features/dashboard/routes";
import { SiteActionsMenuItems } from "@/features/dashboard/sites/site-actions-menu-items";
import type { SiteManagementTarget } from "@/features/dashboard/sites/site-management-dialogs";
import type { SiteNavigationItem } from "@/features/dashboard/use-site-navigation";
import { CreatePageDialog } from "@/features/editor/pages/create-page-dialog";
import { PageTree } from "@/features/editor/pages/page-tree";
import {
  openActiveSiteEditorAction,
  type SiteEditorAction,
} from "@/features/editor/site-action-event";
import { getSiteOpenUrl } from "@/features/published-sites/urls";
import { useRouter } from "@/i18n/navigation";
import {
  Add01Icon,
  ArrowDown01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ActionRow,
  ActionRowAction,
  ActionRowActions,
  ActionRowLabel,
  ActionRowMain,
  ActionRowStatus,
} from "@baseblocks/ui/action-row";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@baseblocks/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@baseblocks/ui/sidebar";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function SiteNavigationGroup({
  activeSiteId,
  analyticsEnabled,
  canEdit,
  canManageSites,
  onDeleteSite,
  onUnpublishSite,
  previewing,
  onSelectActivePage,
  selectedPageId,
  site,
  teamSlug,
}: {
  activeSiteId: string | null;
  analyticsEnabled: boolean;
  canEdit: boolean;
  canManageSites: boolean;
  onDeleteSite: (site: SiteManagementTarget) => void;
  onUnpublishSite: (siteId: string) => void;
  previewing: boolean;
  onSelectActivePage: (pageId: string) => void;
  selectedPageId: string | null;
  site: SiteNavigationItem;
  teamSlug: string;
}) {
  const router = useRouter();
  const t = useTranslations();
  const isActive = activeSiteId === site._id;
  const [expandedOverride, setExpandedOverride] = useState<boolean | null>(
    null,
  );
  const expanded = expandedOverride ?? isActive;
  const siteHref = getTeamSiteEditorPath(teamSlug, site._id);
  const disclosureLabel = t(
    expanded ? "navigation.collapseSite" : "navigation.expandSite",
    { site: site.name },
  );
  const openSiteAction = (action: SiteEditorAction) => {
    if (isActive) {
      openActiveSiteEditorAction(action);
      return;
    }

    const params = new URLSearchParams();
    params.set("action", action);
    router.push(`${siteHref}?${params.toString()}`);
  };

  const siteActionItems = (kind: "context" | "dropdown") => (
    <SiteActionsMenuItems
      analyticsEnabled={analyticsEnabled}
      canDelete={canManageSites}
      isPreviewing={previewing}
      kind={kind}
      onDelete={() => onDeleteSite(site)}
      onHistory={() => openSiteAction("history")}
      onPreview={() => openSiteAction("preview")}
      onPublish={() => openSiteAction("publish")}
      onSettings={() => openSiteAction("settings")}
      onShare={() => openSiteAction("share")}
      onUnpublish={
        site.liveReleaseId ? () => onUnpublishSite(site._id) : undefined
      }
      onViewSite={() =>
        window.open(getSiteOpenUrl(teamSlug, site.slug), "_blank")
      }
      siteId={site._id}
      sitePublished={Boolean(site.liveReleaseId)}
      teamSlug={teamSlug}
    />
  );

  const siteHeader = (
    <ActionRow className="group/site relative min-w-0">
      <ActionRowMain asChild>
        <SidebarMenuButton
          asChild
          className={cn(
            appSidebarRowClassName,
            "relative text-left",
            isActive && "font-medium text-sidebar-foreground",
          )}
          isActive={isActive}
        >
          <button
            aria-expanded={expanded}
            aria-label={disclosureLabel}
            onClick={() => setExpandedOverride(!expanded)}
            title={site.name}
            type="button"
          >
            <span className={appSidebarIconSlotClassName}>
              <span className="flex size-3.5 items-center justify-center overflow-hidden rounded-sm bg-sidebar-accent text-[0.5rem] font-medium">
                {site.logoUrl ? (
                  // biome-ignore lint/performance/noImgElement: Stored site marks are already optimized at their source URL.
                  <img
                    alt=""
                    className="size-full object-cover"
                    src={site.logoUrl}
                  />
                ) : (
                  (site.name[0]?.toUpperCase() ?? "S")
                )}
              </span>
            </span>
            <ActionRowLabel className="flex min-w-0 flex-1">
              <MiddleTruncate className="flex-1" text={site.name} />
            </ActionRowLabel>
          </button>
        </SidebarMenuButton>
      </ActionRowMain>
      <ActionRowStatus className="absolute inset-y-0 end-[var(--app-sidebar-trailing-inset)] z-20 flex w-7 items-center justify-center text-sidebar-foreground/45">
        <HugeiconsIcon
          aria-hidden
          className={cn(
            "size-3.5 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
            !expanded && "-rotate-90",
          )}
          icon={ArrowDown01Icon}
        />
      </ActionRowStatus>
      <ActionRowActions
        className="end-[var(--app-sidebar-trailing-inset)] z-30"
        side="end"
      >
        {canManageSites ? (
          <DropdownMenuTrigger asChild>
            <ActionRowAction
              aria-label={`${t("sites.actions")}: ${site.name}`}
              className="flex h-full w-7 items-center justify-center rounded-md text-sidebar-foreground/40 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring data-[state=open]:text-sidebar-foreground"
              type="button"
            >
              <HugeiconsIcon
                aria-hidden
                className="size-3.5"
                icon={MoreHorizontalIcon}
              />
            </ActionRowAction>
          </DropdownMenuTrigger>
        ) : null}
        {canEdit ? (
          <CreatePageDialog
            siteId={site._id}
            trigger={
              <ActionRowAction
                aria-label={t("navigation.addPageToSite", {
                  site: site.name,
                })}
                className="flex h-full w-7 items-center justify-center rounded-md text-sidebar-foreground/40 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
                type="button"
              >
                <HugeiconsIcon
                  aria-hidden
                  className="size-3.5"
                  icon={Add01Icon}
                />
              </ActionRowAction>
            }
          />
        ) : null}
        <ActionRowAction
          aria-label={disclosureLabel}
          className="flex h-full w-7 items-center justify-center rounded-md text-sidebar-foreground/45 outline-none transition-colors hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sidebar-ring"
          onClick={() => setExpandedOverride(!expanded)}
          type="button"
        >
          <HugeiconsIcon
            aria-hidden
            className={cn(
              "size-3.5 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
              !expanded && "-rotate-90",
            )}
            icon={ArrowDown01Icon}
          />
        </ActionRowAction>
      </ActionRowActions>
    </ActionRow>
  );

  const selectPage = (pageId: string) => {
    if (isActive) {
      onSelectActivePage(pageId);
      return;
    }
    router.push(`${siteHref}?page=${encodeURIComponent(pageId)}`);
  };

  return (
    <SidebarMenuItem
      className={cn(
        "flex flex-col [--app-sidebar-leading-inset:1.25rem] [--app-sidebar-trailing-inset:0.125rem]",
        appSidebarRowGapClassName,
      )}
    >
      {canManageSites ? (
        <DropdownMenu>
          <ContextMenu>
            <ContextMenuTrigger asChild>{siteHeader}</ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              {siteActionItems("context")}
            </ContextMenuContent>
          </ContextMenu>
          <DropdownMenuContent
            align="start"
            className="w-52"
            side="right"
            sideOffset={6}
          >
            {siteActionItems("dropdown")}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        siteHeader
      )}
      <AnimatedDisclosure open={expanded}>
        {site.pages.length > 0 ? (
          <SidebarMenu
            aria-label={t("navigation.sitePages", { site: site.name })}
            className={appSidebarRowGapClassName}
            role="tree"
          >
            <PageTree
              allPages={site.pages}
              defaultPageId={site.defaultPageId}
              onSelect={selectPage}
              selectedPageId={
                isActive ? (selectedPageId ?? undefined) : undefined
              }
              siteId={site._id}
            />
          </SidebarMenu>
        ) : (
          <p className="px-7 py-1.5 text-xs text-sidebar-foreground/40">
            {t("navigation.noPages")}
          </p>
        )}
      </AnimatedDisclosure>
    </SidebarMenuItem>
  );
}
