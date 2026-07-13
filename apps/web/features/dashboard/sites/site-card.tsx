"use client";

import { Link } from "@/i18n/navigation";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation } from "convex/react";
import { ExternalLink, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";
import { EditSiteDialog } from "./edit-site-dialog";

interface SiteCardProps {
  canManageSites: boolean;
  site: {
    _id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    isPublished: boolean;
    team?: {
      _id: string;
      name: string;
      slug: string;
    } | null;
  };
  teamSlug: string;
}

export function SiteCard({ canManageSites, site, teamSlug }: SiteCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const t = useTranslations();

  const deleteSite = useMutation(api.sites.remove);

  const effectiveTeamSlug = site.team?.slug ?? teamSlug;
  const editorHref = getTeamSiteEditorPath(effectiveTeamSlug, site._id);
  const isPublished = site.isPublished;
  const statusLabel = isPublished ? t("sites.published") : t("sites.draft");

  const handleViewSite = () => {
    window.open(getSiteOpenUrl(effectiveTeamSlug, site.slug), "_blank");
  };

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
      <article className="group relative flex min-h-[7.5rem] flex-col justify-between gap-4 rounded-xl border bg-card p-4 transition-shadow duration-150 hover:shadow-sm">
        <Link
          aria-label={openEditorLabel}
          className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href={editorHref}
        />

        <div className="flex items-start justify-between gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-sm font-medium text-muted-foreground">
            {site.logoUrl ? (
              <Image
                src={site.logoUrl}
                alt={site.name}
                className="h-9 w-9 object-contain"
                width={36}
                height={36}
                unoptimized
              />
            ) : (
              site.name[0]?.toUpperCase() || "S"
            )}
          </div>

          <div className="relative z-10 flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "mr-1 inline-flex h-2 w-2 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                    isPublished
                      ? "bg-green-500 dark:bg-green-400"
                      : "bg-amber-500 dark:bg-amber-300",
                  )}
                >
                  <span className="sr-only">{statusLabel}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                {statusLabel}
              </TooltipContent>
            </Tooltip>

            <div className="flex items-center gap-0.5 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              {site.isPublished && (
                <Button
                  aria-label={t("sites.viewSite")}
                  className="h-7 w-7 text-muted-foreground"
                  onClick={handleViewSite}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              )}

              {canManageSites && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      aria-label={t("common.settings")}
                      className="h-7 w-7 text-muted-foreground"
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium leading-snug">
            {site.name}
          </h3>
          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            /{site.slug}
          </p>
        </div>
      </article>

      {canManageSites && (
        <EditSiteDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          site={site}
        />
      )}

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
                {isDeleting ? t("dialogs.delete.deleting") : t("sites.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
