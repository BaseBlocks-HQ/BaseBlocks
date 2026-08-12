"use client";

import { getTeamAnalyticsPath } from "@/features/dashboard/routes";
import { Link } from "@/i18n/navigation";
import { Badge } from "@baseblocks/ui/badge";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@baseblocks/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@baseblocks/ui/dropdown-menu";
import {
  Analytics01Icon,
  CogIcon,
  Delete01Icon,
  FileClockIcon,
  Globe02Icon,
  LinkSquare01Icon,
  PencilEdit01Icon,
  SentIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import type { ComponentProps, ReactNode } from "react";

type MenuKind = "context" | "dropdown";

type SiteActionsMenuItemsProps = {
  analyticsEnabled: boolean;
  canDelete: boolean;
  isPreviewing?: boolean;
  kind: MenuKind;
  onDelete?: () => void;
  onHistory: () => void;
  onPreview: () => void;
  onPublish: () => void;
  onSettings: () => void;
  onShare: () => void;
  onUnpublish?: () => void;
  onViewSite: () => void;
  siteId: string;
  sitePublished: boolean;
  teamSlug: string;
};

export function SiteActionsMenuItems({
  analyticsEnabled,
  canDelete,
  isPreviewing = false,
  kind,
  onDelete,
  onHistory,
  onPreview,
  onPublish,
  onSettings,
  onShare,
  onUnpublish,
  onViewSite,
  siteId,
  sitePublished,
  teamSlug,
}: SiteActionsMenuItemsProps) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  const tSites = useTranslations("sites");
  const tNavigation = useTranslations("navigation");
  const Item = kind === "context" ? ContextMenuItem : DropdownMenuItem;
  const Separator =
    kind === "context" ? ContextMenuSeparator : DropdownMenuSeparator;

  const action = (
    key: string,
    icon: ComponentProps<typeof HugeiconsIcon>["icon"],
    label: ReactNode,
    onSelect: () => void,
    destructive = false,
  ) => (
    <Item
      key={key}
      onSelect={onSelect}
      variant={destructive ? "destructive" : undefined}
    >
      <HugeiconsIcon icon={icon} />
      {label}
    </Item>
  );

  return (
    <>
      {action(
        "preview",
        isPreviewing ? PencilEdit01Icon : ViewIcon,
        isPreviewing ? tHeader("edit") : tHeader("preview"),
        onPreview,
      )}
      {sitePublished
        ? action("view", LinkSquare01Icon, t("viewSite"), onViewSite)
        : null}
      <Separator />
      {action("settings", CogIcon, tNavigation("settings"), onSettings)}
      {analyticsEnabled ? (
        <Item asChild>
          <Link href={`${getTeamAnalyticsPath(teamSlug)}?site=${siteId}`}>
            <HugeiconsIcon icon={Analytics01Icon} />
            {tNavigation("analytics")}
          </Link>
        </Item>
      ) : (
        <Item disabled>
          <HugeiconsIcon icon={Analytics01Icon} />
          {tNavigation("analytics")}
          <Badge
            className="ml-auto h-5 px-1.5 text-[10px] font-normal"
            variant="outline"
          >
            {tNavigation("comingSoon")}
          </Badge>
        </Item>
      )}
      <Separator />
      {!sitePublished
        ? action("publish", Globe02Icon, tHeader("publishSite"), onPublish)
        : null}
      {sitePublished ? (
        <>
          {action("share", SentIcon, tHeader("share"), onShare)}
          {action(
            "history",
            FileClockIcon,
            tHeader("deploymentHistory"),
            onHistory,
          )}
          {onUnpublish ? (
            <>
              <Separator />
              {action(
                "unpublish",
                ViewOffIcon,
                t("unpublish"),
                onUnpublish,
                true,
              )}
            </>
          ) : null}
        </>
      ) : null}
      {canDelete && onDelete ? (
        <>
          {sitePublished && onUnpublish ? null : <Separator />}
          {action("delete", Delete01Icon, tSites("delete"), onDelete, true)}
        </>
      ) : null}
    </>
  );
}
