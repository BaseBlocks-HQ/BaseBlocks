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
import { cn } from "@baseblocks/ui/lib/utils";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useMutation, useQuery } from "convex/react";
import { ChevronDown, Globe } from "lucide-react";
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
  const [collapsedSites, setCollapsedSites] = useState<Set<string>>(new Set());

  const { capabilities, team } = useTeamAccess();
  const sites = useTeamSites(team._id);
  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);

  const siteLibraries = useQuery(
    api.documentLibraries.queries.listAllWithCounts,
    sites ? { teamId: team._id } : "skip",
  );

  const toggleSite = (siteId: string) => {
    setCollapsedSites((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) next.delete(siteId);
      else next.add(siteId);
      return next;
    });
  };

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

  const librariesBySite = new Map<string, LibraryWithCount[]>();
  if (siteLibraries) {
    for (const library of siteLibraries) {
      const siteId = library.siteId;
      if (!librariesBySite.has(siteId)) librariesBySite.set(siteId, []);
      librariesBySite.get(siteId)!.push(library);
    }
  }

  if (sites === undefined) {
    return (
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-[64rem]">
          <div className="mb-8 flex items-center justify-between">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
          <div className="space-y-8">
            {["skeleton-a", "skeleton-b"].map((id) => (
              <div key={id} className="space-y-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-3.5 rounded" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-6 rounded-full" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {["c1", "c2", "c3"].map((cId) => (
                    <div
                      key={cId}
                      className="flex flex-col gap-4 rounded-xl border bg-card p-4"
                    >
                      <Skeleton className="h-9 w-9 rounded-lg" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-[64rem]">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("libraries.title")}</h1>
          {capabilities.canManageLibraries && sites && sites.length > 0 && (
            <CreateLibraryDialog sites={sites} />
          )}
        </div>

        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mb-1 font-medium">{t("libraries.noSites")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("libraries.noSitesDescription")}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sites.map((site: Doc<"sites">) => {
              const libraries = librariesBySite.get(site._id) || [];
              const isCollapsed = collapsedSites.has(site._id);

              return (
                <div key={site._id}>
                  <button
                    type="button"
                    onClick={() => toggleSite(site._id)}
                    className="mb-4 flex w-full items-center gap-2 py-1 text-left"
                  >
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                    <h2 className="text-sm font-medium">{site.name}</h2>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                      {libraries.length}
                    </span>
                  </button>

                  {!isCollapsed && (
                    <LibraryList
                      canManageLibraries={capabilities.canManageLibraries}
                      libraries={libraries}
                      onEdit={setEditingLibrary}
                      onDelete={setDeletingLibrary}
                      teamSlug={team.slug}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {capabilities.canManageLibraries && (
          <LibrarySettingsDialog
            library={editingLibrary}
            open={!!editingLibrary}
            onOpenChange={(open) => !open && setEditingLibrary(null)}
          />
        )}

        {capabilities.canManageLibraries && (
          <AlertDialog
            open={!!deletingLibrary}
            onOpenChange={(open) => !open && setDeletingLibrary(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("libraries.deleteTitle")}
                </AlertDialogTitle>
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
      </div>
    </main>
  );
}
