"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Skeleton } from "@repo/ui/skeleton";
import { api } from "@repo/backend";
import type { Doc } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CreateLibraryDialog } from "./create-library-dialog";
import { LibraryList } from "./library-list";
import type { LibraryWithCount } from "./library-list-item";
import { LibrarySettingsDialog } from "./library-settings-dialog";

export function LibrariesPageContent() {
  const t = useTranslations();
  const [editingLibrary, setEditingLibrary] = useState<LibraryWithCount | null>(
    null,
  );
  const [deletingLibrary, setDeletingLibrary] =
    useState<LibraryWithCount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const sites = useQuery(api.sites.queries.list);
  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);

  // Fetch libraries with counts for each site
  const siteLibraries = useQuery(
    api.documentLibraries.queries.listAllWithCounts,
    sites ? {} : "skip",
  );

  const handleDelete = async () => {
    if (!deletingLibrary) return;
    setIsDeleting(true);
    try {
      await deleteLibrary({ libraryId: deletingLibrary._id });
      setDeletingLibrary(null);
    } catch (error) {
      console.error("Failed to delete library:", error);
    } finally {
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
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
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
        {sites && sites.length > 0 && <CreateLibraryDialog sites={sites} />}
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
                  libraries={libraries}
                  onEdit={setEditingLibrary}
                  onDelete={setDeletingLibrary}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <LibrarySettingsDialog
        library={editingLibrary}
        open={!!editingLibrary}
        onOpenChange={(open) => !open && setEditingLibrary(null)}
      />

      {/* Delete Confirmation Dialog */}
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
    </main>
  );
}
