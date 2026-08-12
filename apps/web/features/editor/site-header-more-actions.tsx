"use client";

import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { SiteActionsMenuItems } from "@/features/dashboard/sites/site-actions-menu-items";
import {
  SiteManagementDialogs,
  type SiteManagementTarget,
} from "@/features/dashboard/sites/site-management-dialogs";
import type { EditorDialogName } from "@/features/editor/editor-dialogs";
import { getSiteOpenUrl } from "@/features/published-sites/urls";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
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
  const tHeader = useTranslations("editor.header");
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
          <SiteActionsMenuItems
            analyticsEnabled={analyticsEnabled}
            canDelete={canManageSites && Boolean(site)}
            isPreviewing={isPreviewing}
            kind="dropdown"
            onDelete={() => setDeleteOpen(true)}
            onHistory={() => onOpenDialog("history", triggerRef.current)}
            onPreview={() => onTogglePreview?.()}
            onPublish={() => onOpenDialog("publish", triggerRef.current)}
            onSettings={() => onOpenDialog("settings", triggerRef.current)}
            onShare={() => onOpenDialog("share", triggerRef.current)}
            onUnpublish={onUnpublish}
            onViewSite={() =>
              window.open(getSiteOpenUrl(teamSlug, siteSlug), "_blank")
            }
            siteId={siteId}
            sitePublished={sitePublished}
            teamSlug={teamSlug}
          />
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
