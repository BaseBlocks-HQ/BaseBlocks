"use client";

import { useTeamSites } from "@/lib/data/use-site";
import { useTeamAccess } from "@/modules/team/team-access";
import { api } from "@baseblocks/backend";
import type { Doc } from "@baseblocks/backend";
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
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useMutation, useQuery } from "convex/react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateLibraryDialog } from "./components/create-library-dialog";
import { LibraryList } from "./components/library-list";
import type { LibraryWithCount } from "./components/library-list-item";
import { LibrarySettingsDialog } from "./components/library-settings-dialog";

export function LibrariesPageContent() {
  const t = useTranslations();
  const [editingLibrary, setEditingLibrary] = useState<LibraryWithCount | null>(
    null,
  );
  const [deletingLibrary, setDeletingLibrary] =
    useState<LibraryWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { capabilities, team } = useTeamAccess();
  const sites = useTeamSites(team._id);
  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);

  // Fetch libraries with counts for each site
  const siteLibraries = useQuery(
    api.documentLibraries.queries.listAllWithCounts,
    sites ? { teamId: team._id } : "skip",
  );

  const handleDelete = async () => {
    if (!deletingLibrary) return;
    setIsDeleting(true);
    try {
      await deleteLibrary({ libraryId: deletingLibrary._id });
      setDeletingLibrary(null);
      setIsDeleting(false);
    } catch (_error) {
      setIsDeleting(false);
    }
  };

  // Group libraries by site
  const librariesBySite = new Map<string, LibraryWithCount[]>();
  if (siteLibraries) {
    for (const library of siteLibraries) {
      const siteId = library.siteId;
      if (!librariesBySite.has(siteId)) {
        librariesBySite.set(siteId, []);
      }
      librariesBySite.get(siteId)!.push(library);
    }
  }

  if (sites === undefined) {
    return (
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-7 w-36 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        <div className="space-y-8">
          {["skeleton-a", "skeleton-b"].map((skeletonId) => (
            <div key={skeletonId} className="space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-6 rounded-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-14 w-full rounded-lg" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t("libraries.title")}</h1>
          <p className="text-muted-foreground">{t("libraries.subtitle")}</p>
        </div>
        {capabilities.canManageLibraries && sites && sites.length > 0 && (
          <CreateLibraryDialog sites={sites} />
        )}
      </div>

      {sites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
            <Globe className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-lg mb-1">{t("libraries.noSites")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("libraries.noSitesDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sites.map((site: Doc<"sites">) => {
            const libraries = librariesBySite.get(site._id) || [];
            return (
              <div key={site._id}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold">{site.name}</h2>
                  <span className="text-sm text-muted-foreground">
                    ({libraries.length})
                  </span>
                </div>
                <LibraryList
                  canManageLibraries={capabilities.canManageLibraries}
                  libraries={libraries}
                  onEdit={setEditingLibrary}
                  onDelete={setDeletingLibrary}
                  teamSlug={team.slug}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      {capabilities.canManageLibraries && (
        <LibrarySettingsDialog
          library={editingLibrary}
          open={!!editingLibrary}
          onOpenChange={(open) => !open && setEditingLibrary(null)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {capabilities.canManageLibraries && (
        <AlertDialog
          open={!!deletingLibrary}
          onOpenChange={(open) => !open && setDeletingLibrary(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("libraries.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("libraries.deleteDescription", {
                  name: deletingLibrary?.name ?? "",
                })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? t("common.loading") : t("common.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </main>
  );
}
