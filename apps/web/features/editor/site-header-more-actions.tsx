"use client";

import {
  getTeamAnalyticsPath,
  getTeamDashboardPath,
} from "@/features/dashboard/routes";
import {
  SiteManagementDialogs,
  type SiteManagementTarget,
} from "@/features/dashboard/sites/site-management-dialogs";
import type { EditorDialogName } from "@/features/editor/editor-dialogs";
import { getSiteOpenUrl } from "@/features/published-sites/urls";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@baseblocks/ui/button";
import { Badge } from "@baseblocks/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Analytics01Icon,
  Delete01Icon,
  FileClockIcon,
  Globe02Icon,
  LinkSquare01Icon,
  MoreHorizontalIcon,
  PencilEdit01Icon,
  SentIcon,
  CogIcon,
  ViewIcon,
  ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";

export function SiteHeaderMoreActions({
  analyticsEnabled,
  canManageSites,
  isPreviewing,
  onOpenDialog,
  onTogglePreview,
  onUnpublish,
  sitePublished,
  siteId,
  siteSlug,
  teamSlug,
  site,
}: {
  analyticsEnabled: boolean;
  canManageSites: boolean;
  isPreviewing: boolean;
  onOpenDialog: (
    dialog: EditorDialogName,
    returnFocusTo: HTMLElement | null,
  ) => void;
  onTogglePreview?: () => void;
  onUnpublish?: () => void;
  sitePublished: boolean;
  siteId: string;
  siteSlug: string;
  teamSlug: string;
  site: SiteManagementTarget | null;
}) {
  const t = useTranslations("editor");
  const tHeader = useTranslations("editor.header");
  const tSites = useTranslations("sites");
  const tNavigation = useTranslations("navigation");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            ref={triggerRef}
            aria-label={tHeader("moreActions")}
            className="size-8 rounded-lg px-0 [&_svg]:size-4"
            size="sm"
            title={tHeader("moreActions")}
            variant="ghost"
          >
            <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52" sideOffset={6}>
          {onTogglePreview ? (
            <DropdownMenuItem onSelect={onTogglePreview}>
              <HugeiconsIcon
                icon={isPreviewing ? PencilEdit01Icon : ViewIcon}
              />
              {isPreviewing ? tHeader("edit") : tHeader("preview")}
            </DropdownMenuItem>
          ) : null}
          {sitePublished ? (
            <DropdownMenuItem
              onSelect={() =>
                window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank")
              }
            >
              <HugeiconsIcon icon={LinkSquare01Icon} />
              {t("viewSite")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => onOpenDialog("settings", triggerRef.current)}
          >
            <HugeiconsIcon icon={CogIcon} />
            {tNavigation("settings")}
          </DropdownMenuItem>
          {analyticsEnabled ? (
            <DropdownMenuItem asChild>
              <Link href={`${getTeamAnalyticsPath(teamSlug)}?site=${siteId}`}>
                <HugeiconsIcon icon={Analytics01Icon} />
                {tNavigation("analytics")}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled>
              <HugeiconsIcon icon={Analytics01Icon} />
              {tNavigation("analytics")}
              <Badge
                className="ml-auto h-5 px-1.5 text-[10px] font-normal"
                variant="outline"
              >
                {tNavigation("comingSoon")}
              </Badge>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {!sitePublished ? (
            <DropdownMenuItem
              onSelect={() => onOpenDialog("publish", triggerRef.current)}
            >
              <HugeiconsIcon icon={Globe02Icon} />
              {tHeader("publishSite")}
            </DropdownMenuItem>
          ) : null}
          {sitePublished ? (
            <>
              <DropdownMenuItem
                onSelect={() => onOpenDialog("share", triggerRef.current)}
              >
                <HugeiconsIcon icon={SentIcon} />
                {tHeader("share")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onOpenDialog("history", triggerRef.current)}
              >
                <HugeiconsIcon icon={FileClockIcon} />
                {tHeader("deploymentHistory")}
              </DropdownMenuItem>
              {onUnpublish ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={onUnpublish}
                    variant="destructive"
                  >
                    <HugeiconsIcon icon={ViewOffIcon} />
                    {t("unpublish")}
                  </DropdownMenuItem>
                </>
              ) : null}
            </>
          ) : null}
          {canManageSites && site ? (
            <>
              {sitePublished && onUnpublish ? null : <DropdownMenuSeparator />}
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                variant="destructive"
              >
                <HugeiconsIcon icon={Delete01Icon} />
                {tSites("delete")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {canManageSites && site ? (
        <SiteManagementDialogs
          deleteOpen={deleteOpen}
          onDeleteOpenChange={setDeleteOpen}
          onDeleted={() => router.replace(getTeamDashboardPath(teamSlug))}
          site={site}
        />
      ) : null}
    </>
  );
}
