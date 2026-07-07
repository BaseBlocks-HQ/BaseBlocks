"use client";

import { InlineEditableText } from "@/modules/dashboard/libraries/inline-editable-text";
import { Link, useRouter } from "@/i18n/navigation";
import { getTeamLibrariesPath } from "@/lib/routes/team-routes";
import {
  useAuthenticatedLibraryData,
  useLibraryActions,
} from "@/modules/document-library/hooks";
import type { LibraryId } from "@/modules/document-library/types";
import { useTeamAccess } from "@/modules/workspace/team-access";
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
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, MoreHorizontal, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { LibraryExplorer } from "@/modules/document-library/components/library-explorer";

export function LibraryDetailPage({ libraryId }: { libraryId: LibraryId }) {
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
  const updateLibrary = useMutation(api.documentLibraries.mutations.update);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (data.isLoading || site === undefined) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <Spinner className="size-6 text-muted-foreground" />
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

  const handleRenameLibrary = async (name: string) => {
    try {
      await updateLibrary({
        libraryId,
        name,
      });
      toast.success(t("common.saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("common.error"));
      throw error;
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <div className="mx-auto flex min-h-0 w-full max-w-[72rem] flex-1 flex-col gap-4 overflow-hidden">
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
                <InlineEditableText
                  disabled={!capabilities.canManageLibraries}
                  inputClassName="h-auto border-none shadow-none"
                  onSubmit={handleRenameLibrary}
                  textClassName="max-w-full text-2xl font-bold"
                  value={data.library.name}
                />
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {data.files.length.toLocaleString()}
                </span>
              </div>
              <p className="truncate text-sm text-muted-foreground">
                {site.name}
              </p>
            </div>
          </div>

          {capabilities.canManageLibraries ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  aria-label="Library actions"
                  className="h-9 w-9 shrink-0"
                  size="icon"
                  variant="outline"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <AlertDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => !open && setDeleteDialogOpen(false)}
        >
          <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
            <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
              <AlertDialogTitle className="text-base font-semibold text-balance">
                {t("libraries.deleteTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
                {t("libraries.deleteDescription", {
                  name: data.library.name,
                })}
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
                onClick={handleDeleteLibrary}
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
