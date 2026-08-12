"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Delete01Icon,
  LinkSquare01Icon,
  MoreHorizontalIcon,
} from "@hugeicons/core-free-icons";
import { Link } from "@/i18n/navigation";
import { DashboardListRow } from "@/features/dashboard/layout/dashboard-page";
import { getTeamSiteEditorPath } from "@/features/dashboard/routes";
import { getSiteOpenUrl } from "@/features/published-sites/urls";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import { Button } from "@baseblocks/ui/button";
import { Spinner } from "@baseblocks/ui/spinner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

interface SiteCardProps {
  canManageSites: boolean;
  site: {
    _id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    liveReleaseId?: string;
    team?: {
      _id: string;
      name: string;
      slug: string;
    } | null;
  };
  teamSlug: string;
}

export function SiteCard({ canManageSites, site, teamSlug }: SiteCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations();

  const deleteSite = useMutation(api.sites.remove);

  const effectiveTeamSlug = site.team?.slug ?? teamSlug;
  const editorHref = getTeamSiteEditorPath(effectiveTeamSlug, site._id);
  const publishedSiteHref = getSiteOpenUrl(effectiveTeamSlug, site.slug);
  const isPublished = Boolean(site.liveReleaseId);
  const statusLabel = isPublished ? t("sites.published") : t("sites.draft");

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSite({ siteId: site._id as Id<"sites"> });
      setDeleteOpen(false);
      setIsDeleting(false);
    } catch (_err) {
      setIsDeleting(false);
    }
  };

  const openEditorLabel = t("sites.edit");

  return (
    <>
      <DashboardListRow className="group">
        <Link
          aria-label={openEditorLabel}
          className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          href={editorHref}
        />

        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-medium text-muted-foreground">
          {site.logoUrl ? (
            <Image
              src={site.logoUrl}
              alt=""
              aria-hidden="true"
              className="size-10 object-cover"
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            site.name[0]?.toUpperCase() || "S"
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium leading-snug">
            {site.name}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {statusLabel}
          </p>
        </div>

        <div className="relative z-10 -mr-1 flex shrink-0 items-center gap-0.5">
          {isPublished || canManageSites ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label={
                    canManageSites ? t("common.settings") : t("sites.viewSite")
                  }
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  size="icon"
                  title={
                    canManageSites ? t("common.settings") : t("sites.viewSite")
                  }
                  type="button"
                  variant="ghost"
                >
                  <HugeiconsIcon
                    icon={MoreHorizontalIcon}
                    className="h-3.5 w-3.5"
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isPublished ? (
                  <DropdownMenuItem asChild>
                    <a
                      href={publishedSiteHref}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <HugeiconsIcon
                        icon={LinkSquare01Icon}
                        className="mr-2 h-4 w-4"
                      />
                      {t("sites.viewSite")}
                    </a>
                  </DropdownMenuItem>
                ) : null}
                {canManageSites ? (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <HugeiconsIcon
                      icon={Delete01Icon}
                      className="mr-2 h-4 w-4"
                    />
                    {t("common.delete")}
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </DashboardListRow>

      {canManageSites && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
            <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
              <AlertDialogTitle className="text-base font-semibold text-balance">
                {t("sites.delete")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
                {t("sites.confirmDelete")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
              <AlertDialogCancel
                size="sm"
                className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                className="rounded-full px-4 text-sm"
                onClick={handleDelete}
              >
                {isDeleting ? (
                  <>
                    <Spinner />
                    {t("dialogs.delete.deleting")}
                  </>
                ) : (
                  t("sites.delete")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
