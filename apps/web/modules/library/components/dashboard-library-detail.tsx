"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { getTeamLibrariesPath } from "@/lib/routes/team-routes";
import {
  useAuthenticatedLibraryData,
  useLibraryActions,
} from "@/modules/library/data/use-library-data";
import type { LibraryId } from "@/modules/library/types";
import { useTeamAccess } from "@/modules/team/team-access";
import { api } from "@baseblocks/backend";
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
import { Badge } from "@baseblocks/ui/badge";
import { Button } from "@baseblocks/ui/button";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LibrarySettingsDialog } from "../../dashboard/libraries/components/library-settings-dialog";
import { LibraryExplorer } from "./library-explorer";

export function DashboardLibraryDetail({
  libraryId,
}: {
  libraryId: LibraryId;
}) {
  const router = useRouter();
  const t = useTranslations();
  const { capabilities, team } = useTeamAccess();
  const data = useAuthenticatedLibraryData(libraryId);
  const site = useQuery(
    api.sites.queries.get,
    data.library ? { siteId: data.library.siteId } : "skip",
  );
  const actions = useLibraryActions({
    libraryId,
    siteId: data.library?.siteId ?? null,
  });
  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (data.isLoading || site === undefined) {
    return (
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[72rem] flex-1 flex-col gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-7 w-48" />
          </div>
          <Skeleton className="min-h-[32rem] flex-1 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!data.library || !site || site.teamId !== team._id) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">
          {t("libraries.notFound")}
        </p>
      </div>
    );
  }

  const handleDeleteLibrary = async () => {
    setIsDeleting(true);
    try {
      await deleteLibrary({ libraryId });
      router.push(getTeamLibrariesPath(team.slug));
    } catch {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-[72rem] flex-1 flex-col gap-4">
        <header className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 h-8 w-8 shrink-0"
              asChild
            >
              <Link href={getTeamLibrariesPath(team.slug)}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">{t("common.back")}</span>
              </Link>
            </Button>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-2xl font-bold">
                  {data.library.name}
                </h1>
                <Badge variant="secondary" className="shrink-0 tabular-nums">
                  {data.files.length === 1
                    ? "1 file"
                    : `${data.files.length.toLocaleString()} files`}
                </Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {site.name}
              </p>
            </div>
          </div>

          {capabilities.canManageLibraries ? (
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                {t("common.edit")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
                className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {t("common.delete")}
              </Button>
            </div>
          ) : null}
        </header>

        <LibraryExplorer
          data={data}
          actions={capabilities.canManageLibraries ? actions : {}}
          uploadState={capabilities.canManageLibraries ? actions : undefined}
          options={{
            access: capabilities.canManageLibraries ? "manage" : "read",
            allowDownloads: true,
          }}
          className="flex-1"
        />
      </div>

      {capabilities.canManageLibraries ? (
        <LibrarySettingsDialog
          library={{
            _id: data.library._id,
            name: data.library.name,
            siteId: data.library.siteId,
            documentCount: data.files.length,
          }}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      ) : null}

      {capabilities.canManageLibraries ? (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("libraries.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("libraries.deleteDescription", { name: data.library.name })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLibrary}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </div>
  );
}
