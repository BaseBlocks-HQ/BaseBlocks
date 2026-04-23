"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { getTeamLibrariesPath } from "@/lib/routes/team-routes";
import { useFileUpload } from "@/lib/storage/hooks";
import { cn } from "@/lib/utils";
import {
  Breadcrumbs,
  CreateFolderButton,
  FileList,
  FolderTree,
  UploadProgressList,
  useFileOperations,
  useFolderOperations,
  useFolderPath,
} from "@/modules/documents";
import { LibrarySearch } from "@/modules/dashboard/libraries/components/library-search";
import { useTeamAccess } from "@/modules/team/team-access";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@baseblocks/ui/empty";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  File,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { LibrarySettingsDialog } from "./components/library-settings-dialog";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface LibraryDetailContentProps {
  libraryId: Id<"documentLibraries">;
}

export function LibraryDetailContent({ libraryId }: LibraryDetailContentProps) {
  const router = useRouter();
  const t = useTranslations();
  const { capabilities, team } = useTeamAccess();

  const [selectedFolderId, setSelectedFolderId] =
    useState<Id<"documentFolders"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const library = useQuery(api.documentLibraries.queries.get, { libraryId });
  const site = useQuery(
    api.sites.queries.get,
    library ? { siteId: library.siteId } : "skip",
  );

  const {
    folders,
    create: createFolder,
    rename: renameFolder,
    remove: removeFolder,
  } = useFolderOperations(libraryId);

  const {
    files,
    rename: renameFile,
    remove: removeFile,
  } = useFileOperations(libraryId, selectedFolderId);

  const folderPath = useFolderPath(selectedFolderId);
  const { uploadFiles, uploadStates, isAnyUploading, clearAllUploadStates } =
    useFileUpload();

  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);
  const retryExtraction = useAction(
    api.actions.extractDocument.retryExtraction,
  );

  const handleFilesAccepted = async (acceptedFiles: File[]) => {
    if (!library || !site) return;
    await uploadFiles(acceptedFiles, {
      siteId: site._id,
      libraryId: library._id,
      folderId: selectedFolderId ?? undefined,
    });
  };

  const handleDeleteLibrary = async () => {
    setIsDeleting(true);
    try {
      await deleteLibrary({ libraryId });
      router.push(getTeamLibrariesPath(team.slug));
    } catch (_error) {
      setIsDeleting(false);
    }
  };

  // Full-area drop zone — noClick so we don't accidentally open picker on content click
  const { getRootProps, getInputProps, isDragActive, isDragReject, open: openFilePicker } =
    useDropzone({
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) handleFilesAccepted(acceptedFiles);
      },
      disabled: isAnyUploading || !capabilities.canManageLibraries,
      maxSize: MAX_FILE_SIZE,
      multiple: true,
      noClick: true,
    });

  const breadcrumbItems = [
    { id: null, name: t("libraries.rootFolder") },
    ...folderPath.map((folder) => ({ id: folder._id, name: folder.name })),
  ];

  // ── Loading state ──────────────────────────────────────────────────────────
  if (library === undefined || site === undefined) {
    return (
      <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-4 min-h-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-md" />
              <Skeleton className="h-7 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-48 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
          <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border bg-card">
            <div className="w-52 border-r bg-muted/15 p-3 space-y-1.5">
              <Skeleton className="h-7 w-full rounded" />
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-6 w-1/2 rounded" />
            </div>
            <div className="flex-1 p-4 space-y-3">
              <Skeleton className="h-6 w-1/3" />
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Not found / access denied ──────────────────────────────────────────────
  if (!library || !site || site.teamId !== team._id) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">{t("libraries.notFound")}</p>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="mx-auto flex w-full max-w-[64rem] flex-1 flex-col gap-4 min-h-0">

        {/* ── Header row — mirrors the main libraries page ── */}
        <div className="flex items-center justify-between gap-4">
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
            <h1 className="truncate text-2xl font-bold">{library.name}</h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <LibrarySearch libraryId={libraryId} />

            {capabilities.canManageLibraries && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* ── Shell ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">

          {/* ── Panel sidebar ── */}
          <div className="flex w-52 shrink-0 flex-col overflow-hidden border-r bg-muted/15">

            {/* Folder tree */}
            <div className="flex-1 min-h-0">
              <FolderTree
                canManageFolders={capabilities.canManageLibraries}
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={(id) =>
                  setSelectedFolderId(id as Id<"documentFolders"> | null)
                }
                onCreateFolder={async (name, parentId) => {
                  await createFolder(
                    name,
                    parentId as Id<"documentFolders"> | undefined,
                  );
                }}
                onRenameFolder={async (folderId, name) => {
                  await renameFolder(folderId as Id<"documentFolders">, name);
                }}
                onDeleteFolder={async (folderId) => {
                  await removeFolder(folderId as Id<"documentFolders">);
                }}
              />
            </div>

            {/* Sidebar footer — new folder button */}
            {capabilities.canManageLibraries && (
              <div className="p-2">
                <CreateFolderButton
                  className="w-full"
                  onSubmit={async (name) => {
                    await createFolder(
                      name,
                      selectedFolderId ?? undefined,
                    );
                  }}
                />
              </div>
            )}
          </div>

          {/* ── Content area — full drop zone ── */}
          <div
            {...getRootProps()}
            className={cn(
              "relative flex flex-1 flex-col min-h-0 min-w-0 outline-none transition-colors duration-150",
              isDragActive &&
                !isDragReject &&
                capabilities.canManageLibraries &&
                "bg-primary/5",
              isDragReject && "bg-destructive/5",
            )}
          >
            <input {...getInputProps()} />

            {/* Drag overlay */}
            {isDragActive && capabilities.canManageLibraries && (
              <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3">
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full",
                    isDragReject
                      ? "bg-destructive/15 text-destructive"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {isDragReject ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Upload className="h-6 w-6" />
                  )}
                </div>
                <p
                  className={cn(
                    "text-sm font-medium",
                    isDragReject ? "text-destructive" : "text-primary",
                  )}
                >
                  {isDragReject ? "File type not accepted" : "Drop to upload"}
                </p>
              </div>
            )}

            {/* Breadcrumbs + upload button */}
            <div className="flex items-center justify-between border-b px-4 py-2">
              <Breadcrumbs
                items={breadcrumbItems}
                onNavigate={(id) =>
                  setSelectedFolderId(id as Id<"documentFolders"> | null)
                }
              />
              {capabilities.canManageLibraries && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 shrink-0 gap-1.5 text-xs"
                  onClick={openFilePicker}
                  disabled={isAnyUploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </Button>
              )}
            </div>

            {/* Upload progress */}
            {Object.keys(uploadStates).length > 0 && (
              <div className="border-b px-4 py-2">
                <UploadProgressList
                  uploads={uploadStates}
                  onDismiss={() => clearAllUploadStates()}
                />
              </div>
            )}

            {/* Files — empty state uses the UI primitive */}
            {files.length === 0 ? (
              <Empty className="flex-1 min-h-0 border-none rounded-none">
                <EmptyMedia variant="icon">
                  <File />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No files yet</EmptyTitle>
                  <EmptyDescription>
                    {capabilities.canManageLibraries
                      ? "Drag files here or click Upload to add files"
                      : "This folder is empty"}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex-1 min-h-0">
                <FileList
                  files={files}
                  isReadOnly={!capabilities.canManageLibraries}
                  onDownload={() => {}}
                  onRename={async (fileId, newName) => {
                    await renameFile(fileId as Id<"documents">, newName);
                  }}
                  onDelete={async (fileId) => {
                    await removeFile(fileId as Id<"documents">);
                  }}
                  onRetryExtraction={async (file) => {
                    await retryExtraction({
                      documentId: file._id as Id<"documents">,
                    });
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Dialogs ── */}
      {capabilities.canManageLibraries && (
        <LibrarySettingsDialog
          library={
            library
              ? {
                  _id: library._id,
                  name: library.name,
                  siteId: library.siteId,
                  documentCount: files.length,
                }
              : null
          }
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}

      {capabilities.canManageLibraries && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("libraries.deleteTitle")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("libraries.deleteDescription", { name: library.name })}
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
      )}
    </div>
  );
}
