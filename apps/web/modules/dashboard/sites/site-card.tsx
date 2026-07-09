"use client";

import { Link } from "@/i18n/navigation";
import { getTeamSiteEditorPath } from "@/modules/dashboard/routes";
import { getSiteOpenUrl } from "@/modules/public-site/urls";
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
  NestedCard,
  NestedCardPeek,
  NestedCardSurface,
  nestedCardRadiusClass,
} from "@baseblocks/ui/nested-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { useMutation } from "convex/react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
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
      <NestedCard className="group min-h-[13rem] border-border/75 transition-[box-shadow,border-color,background-color] duration-200 ease-out hover:border-primary/25 hover:shadow-[0_10px_28px_hsl(var(--primary)/0.08)]">
        <NestedCardSurface className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-3">
          <Link
            aria-label={openEditorLabel}
            className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            href={editorHref}
          />
          <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-primary/[0.018] via-transparent to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100" />
          <div className="pointer-events-none relative z-10 flex h-full min-h-0 flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0 rounded-[0.9rem] bg-muted/45 p-0.5 shadow-[inset_0_1px_0_hsl(var(--background)/0.45)] ring-1 ring-border/60 transition-colors duration-200 ease-out group-hover:bg-muted/60 group-hover:ring-primary/20">
                  {site.logoUrl ? (
                    <Image
                      src={site.logoUrl}
                      alt={site.name}
                      className="h-10 w-10 rounded-[0.65rem] border border-border/55 bg-background object-contain"
                      width={40}
                      height={40}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-[0.65rem] bg-primary/95 font-semibold text-sm text-primary-foreground shadow-[inset_0_1px_0_hsl(var(--primary-foreground)/0.25)]">
                      {site.name[0]?.toUpperCase() || "S"}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-semibold leading-tight text-balance">
                    {site.name}
                  </h3>
                  <p className="truncate pt-0.5 font-mono text-[11px] text-muted-foreground/85">
                    /{site.slug}
                  </p>
                </div>
              </div>
              <div className="pointer-events-auto relative z-20 flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
                        isPublished
                          ? "bg-green-500 dark:bg-green-400"
                          : "bg-amber-500 dark:bg-amber-300",
                      )}
                    >
                      <span className="sr-only">{statusLabel}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    sideOffset={6}
                    className={cn(
                      "font-medium",
                      isPublished
                        ? "bg-green-600 text-white"
                        : "bg-amber-500 text-amber-950",
                    )}
                    arrowClassName={cn(
                      isPublished
                        ? "bg-green-600 fill-green-600"
                        : "bg-amber-500 fill-amber-500",
                    )}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          isPublished ? "bg-green-400" : "bg-amber-300",
                        )}
                      />
                      <span>{statusLabel}</span>
                    </span>
                  </TooltipContent>
                </Tooltip>
                {canManageSites && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        className="h-9 w-9 shrink-0 rounded-[0.9rem] text-muted-foreground transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-accent/85 hover:text-foreground focus-visible:ring-primary/35"
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">{t("common.settings")}</span>
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
        </NestedCardSurface>

        <NestedCardPeek
          className={cn(
            nestedCardRadiusClass,
            "border border-border/55 bg-background/80 p-1 shadow-[inset_0_1px_0_hsl(var(--background)/0.5)] dark:border-border/40 dark:bg-background/46 dark:shadow-[inset_0_1px_0_hsl(var(--background)/0.19)]",
          )}
        >
          <Button
            asChild
            className="h-8 min-h-8 min-w-0 flex-1 shrink-0 justify-center rounded-[0.9rem] px-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-accent/80 hover:text-foreground sm:rounded-[1rem] dark:hover:bg-accent/55"
            variant="ghost"
          >
            <Link href={editorHref}>{t("sites.edit")}</Link>
          </Button>
          {site.isPublished && (
            <Button
              className="h-8 min-h-8 min-w-0 flex-1 shrink-0 justify-center rounded-[0.9rem] px-2 text-sm font-medium text-muted-foreground transition-[background-color,color] duration-150 ease-out hover:bg-accent/80 hover:text-foreground sm:rounded-[1rem] dark:hover:bg-accent/55"
              type="button"
              variant="ghost"
              onClick={handleViewSite}
            >
              {t("sites.viewSite")}
            </Button>
          )}
        </NestedCardPeek>
      </NestedCard>

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
