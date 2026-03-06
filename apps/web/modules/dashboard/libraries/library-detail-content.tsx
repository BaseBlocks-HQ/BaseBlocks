"use client";

import { useRouter } from "@/i18n/navigation";
import { useFileUpload } from "@/lib/storage/hooks";
import {
  Breadcrumbs,
  CreateFolderButton,
  DropZone,
  FileList,
  FolderTree,
  UploadProgressList,
  useFileOperations,
  useFolderOperations,
  useFolderPath,
} from "@/modules/documents";
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
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useAction, useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LibraryHeader } from "./components/library-header";
import { LibrarySearch } from "./components/library-search";
import { LibrarySettingsDialog } from "./components/library-settings-dialog";

interface LibraryDetailContentProps {
  libraryId: Id<"documentLibraries">;
}

export function LibraryDetailContent({ libraryId }: LibraryDetailContentProps) {
  const router = useRouter();
  const t = useTranslations();
  const [selectedFolderId, setSelectedFolderId] =
    useState<Id<"documentFolders"> | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch library data
  const library = useQuery(api.documentLibraries.queries.get, { libraryId });
  const site = useQuery(
    api.sites.queries.get,
    library ? { siteId: library.siteId } : "skip",
  );

  // Folder and file operations
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

  // File upload
  const { uploadFiles, uploadStates, isAnyUploading, clearAllUploadStates } =
    useFileUpload();

  // Delete mutation
  const deleteLibrary = useMutation(api.documentLibraries.mutations.remove);

  // Extraction retry
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteLibrary({ libraryId });
      router.push("/dashboard/libraries");
      setIsDeleting(false);
    } catch (_error) {
      setIsDeleting(false);
    }
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { id: null, name: t("libraries.rootFolder") },
    ...folderPath.map((folder) => ({
      id: folder._id,
      name: folder.name,
    })),
  ];

  if (library === undefined || site === undefined) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="border-b p-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex">
          <div className="w-64 border-r p-4">
            <Skeleton className="h-8 w-full mb-2" />
            <Skeleton className="h-6 w-3/4 mb-1" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!library || !site) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{t("libraries.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <LibraryHeader
        library={library}
        onEdit={() => setEditDialogOpen(true)}
        onDelete={() => setDeleteDialogOpen(true)}
      />

      {/* Search Bar */}
      <div className="border-b p-4">
        <div className="max-w-md">
          <LibrarySearch libraryId={libraryId} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Folder Sidebar */}
        <div className="w-64 border-r flex flex-col min-h-0">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-sm font-medium">
              {t("libraries.folders")}
            </span>
            <CreateFolderButton
              onSubmit={async (name) => {
                await createFolder(name, selectedFolderId ?? undefined);
              }}
            />
          </div>
          <div className="flex-1 min-h-0">
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(folderId) =>
                setSelectedFolderId(folderId as Id<"documentFolders"> | null)
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
        </div>

        {/* Files Area */}
        <div className="flex-1 flex flex-col min-h-0 min-w-0">
          {/* Breadcrumbs */}
          <div className="px-4 py-2 border-b">
            <Breadcrumbs
              items={breadcrumbItems}
              onNavigate={(id) =>
                setSelectedFolderId(id as Id<"documentFolders"> | null)
              }
            />
          </div>

          {/* Drop Zone for uploads */}
          <div className="px-4 pt-4">
            <DropZone
              onFilesAccepted={handleFilesAccepted}
              disabled={isAnyUploading}
              className="min-h-[80px]"
            />
          </div>

          {/* Upload Progress */}
          {Object.keys(uploadStates).length > 0 && (
            <div className="px-4 py-2">
              <UploadProgressList
                uploads={uploadStates}
                onDismiss={() => clearAllUploadStates()}
              />
            </div>
          )}

          {/* File List */}
          <div className="flex-1 overflow-auto p-4">
            <FileList
              files={files}
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
                  authToken: "",
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
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

      {/* Delete Confirmation Dialog */}
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
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
