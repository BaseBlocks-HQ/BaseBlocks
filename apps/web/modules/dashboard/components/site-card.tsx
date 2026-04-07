"use client";

import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { Link } from "@/i18n/navigation";
import { getTeamSiteEditorPath } from "@/lib/routes/team-routes";
import { getSiteOpenUrl } from "@/lib/url";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
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
  nestedCardPeekActionClass,
} from "@baseblocks/ui/nested-card";
import { useMutation } from "convex/react";
import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

  const deleteSite = useMutation(api.sites.mutations.remove);

  const effectiveTeamSlug = site.team?.slug ?? teamSlug;
  const editorHref = getTeamSiteEditorPath(effectiveTeamSlug, site._id);

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
      <NestedCard className="min-h-[13rem] transition-colors hover:border-primary/45">
        <NestedCardSurface className="relative min-h-0 flex-1 overflow-hidden px-3 pb-3 pt-4">
          <Link
            aria-label={openEditorLabel}
            className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            href={editorHref}
          />
          <div className="pointer-events-none relative z-10 flex h-full min-h-0 flex-col justify-between gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="shrink-0">
                  {site.logoUrl ? (
                    <Image
                      src={site.logoUrl}
                      alt={site.name}
                      className="h-10 w-10 rounded-lg border bg-muted object-contain"
                      width={40}
                      height={40}
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-lg text-primary-foreground">
                      {site.name[0]?.toUpperCase() || "S"}
                    </div>
                  )}
                </div>
                <h3 className="min-w-0 flex-1 truncate text-lg font-semibold leading-tight">
                  {site.name}
                </h3>
              </div>
              {canManageSites && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      className="pointer-events-auto relative z-20 h-8 w-8 shrink-0"
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
            <div className="flex min-w-0 items-end gap-3">
              <div
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  site.isPublished
                    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                    : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    site.isPublished ? "bg-green-600" : "bg-amber-500",
                  )}
                />
                {site.isPublished ? t("sites.published") : t("sites.draft")}
              </div>
            </div>
          </div>
        </NestedCardSurface>

        <NestedCardPeek>
          <Button asChild className={nestedCardPeekActionClass} variant="ghost">
            <Link href={editorHref}>
              <Pencil className="h-4 w-4 shrink-0" />
              {t("sites.edit")}
            </Link>
          </Button>
          <Button
            className={nestedCardPeekActionClass}
            disabled={!site.isPublished}
            type="button"
            variant="ghost"
            onClick={handleViewSite}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {t("sites.viewSite")}
          </Button>
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
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={t("sites.delete")}
          description={t("sites.confirmDelete")}
          confirmLabel={
            isDeleting ? t("dialogs.delete.deleting") : t("sites.delete")
          }
          variant="destructive"
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
