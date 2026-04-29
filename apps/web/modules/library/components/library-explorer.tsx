"use client";

import {
  FILE_SEARCH_PARAM,
  buildFileDeepLinkPath,
  toAbsoluteBrowserUrl,
} from "@/lib/file-deep-link";
import { cn } from "@/lib/utils";
import { buildLibraryEntityMap } from "@/modules/library/model/library-paths";
import type {
  FolderId,
  LibraryDialogTarget,
  LibraryEntity,
  LibraryExplorerActions,
  LibraryExplorerData,
  LibraryExplorerOptions,
  LibraryFile,
} from "@/modules/library/types";
import { SplitViewShell } from "@/modules/shared/components/split-view-shell";
import { Drawer, DrawerContent, DrawerTitle } from "@baseblocks/ui/drawer";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DeleteItemDialog, MoveItemDialog } from "./library-dialogs";
import { LibraryFileViewer } from "./library-file-viewer";
import { LibraryTree } from "./library-tree";
import { UploadDropzone } from "./upload-dropzone";

const skeletonRows = [
  "library-skeleton-row-1",
  "library-skeleton-row-2",
  "library-skeleton-row-3",
  "library-skeleton-row-4",
  "library-skeleton-row-5",
  "library-skeleton-row-6",
  "library-skeleton-row-7",
  "library-skeleton-row-8",
];

export function LibraryExplorer({
  actions,
  className,
  data,
  options,
  uploadState,
}: {
  actions: LibraryExplorerActions;
  className?: string;
  data: LibraryExplorerData;
  options: LibraryExplorerOptions;
  /** When provided, disables upload controls and shows in-dropzone upload progress. */
  uploadState?: {
    isAnyUploading: boolean;
    totalProgress?: { percentage: number } | null;
  };
}) {
  const tExplorer = useTranslations("libraries.explorer");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentFolderId, setCurrentFolderId] = useState<FolderId | null>(null);
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  const [treeDrawerOpen, setTreeDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LibraryDialogTarget | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<LibraryDialogTarget | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = options.access === "manage";
  const model = useMemo(
    () => buildLibraryEntityMap(data.folders, data.files),
    [data.folders, data.files],
  );
  const openEntity = openFilePath ? model.entities.get(openFilePath) : null;
  const openFile = openEntity?.kind === "file" ? openEntity.file : null;
  const selectedFileId = searchParams.get(FILE_SEARCH_PARAM);

  useEffect(() => {
    if (!selectedFileId) return;

    for (const entity of model.entities.values()) {
      if (entity.kind === "file" && entity.file._id === selectedFileId) {
        setOpenFilePath(entity.path);
        setCurrentFolderId(entity.file.folderId ?? null);
        return;
      }
    }
  }, [model.entities, selectedFileId]);

  const syncFileUrl = (documentId: string | null) => {
    const nextUrl = buildFileDeepLinkPath(
      pathname,
      searchParams.toString(),
      documentId,
    );
    router.replace(nextUrl, { scroll: false });
  };

  const copyEntityLink = async (entity: LibraryEntity) => {
    if (entity.kind !== "file") return;

    const sharePath = buildFileDeepLinkPath(
      pathname,
      searchParams.toString(),
      entity.file._id,
    );
    await navigator.clipboard.writeText(toAbsoluteBrowserUrl(sharePath));
    toast.success("Link copied");
  };

  const openEntityInExplorer = (entity: LibraryEntity) => {
    if (entity.kind === "folder") {
      setCurrentFolderId(entity.folder._id);
      setOpenFilePath(null);
      syncFileUrl(null);
    } else {
      setOpenFilePath(entity.path);
      setCurrentFolderId(entity.file.folderId ?? null);
      syncFileUrl(entity.file._id);
    }
    setTreeDrawerOpen(false);
  };

  const uploadFiles = async (files: File[]) => {
    const upload = actions.uploadFiles;
    if (!upload || files.length === 0) return;

    const targetFolderId = currentFolderId ?? undefined;
    const count = files.length;
    const primaryName = files[0]?.name ?? "";

    const toastId = toast.loading(
      count === 1
        ? tExplorer("toastUploading", { name: primaryName })
        : tExplorer("toastUploadingCount", { count }),
    );

    const results = await upload(files, targetFolderId).catch((error) => {
      toast.error(
        error instanceof Error ? error.message : tExplorer("toastUploadFailed"),
        { id: toastId },
      );
      return null;
    });

    if (!results) {
      return;
    }

    const succeeded = results.filter(Boolean).length;
    const failed = count - succeeded;

    if (failed === 0) {
      toast.success(
        count === 1
          ? tExplorer("toastUploadedOne", { name: primaryName })
          : tExplorer("toastUploadedMany", { count: succeeded }),
        { id: toastId },
      );
    } else if (succeeded === 0) {
      toast.error(tExplorer("toastUploadFailed"), { id: toastId });
    } else {
      toast.warning(
        tExplorer("toastUploadedPartial", {
          ok: succeeded,
          failed,
        }),
        { id: toastId },
      );
    }
  };

  const deleteItem = async (target: LibraryDialogTarget) => {
    if (target.kind === "folder") {
      await actions.deleteFolder?.(target.id);
      if (currentFolderId === target.id) {
        setCurrentFolderId(null);
      }
    } else {
      await actions.deleteFile?.(target.id);
      if (openEntity?.kind === "file" && openEntity.file._id === target.id) {
        setOpenFilePath(null);
      }
    }
    toast.success(tExplorer("toastDeleted"));
  };

  const moveItem = async (
    target: LibraryDialogTarget,
    targetFolderId: FolderId | undefined,
  ) => {
    if (target.kind === "folder") {
      await actions.moveFolder?.(target.id, targetFolderId);
      if (currentFolderId === target.id) {
        setCurrentFolderId(target.id);
      }
    } else {
      await actions.moveFile?.(target.id, targetFolderId);
      if (openEntity?.kind === "file" && openEntity.file._id === target.id) {
        setCurrentFolderId(targetFolderId ?? null);
      }
    }
    toast.success(tExplorer("toastMoved"));
  };

  const createFolder = async (name: string, parentId?: FolderId) => {
    await actions.createFolder?.(name, parentId);
    toast.success(tExplorer("toastFolderCreated"));
  };

  // Failure modes:
  // - Move mutations are unavailable in read-only contexts
  // - Target folder was deleted or permissions changed before the drop commits
  // - Multiple selected items partially move if the backend rejects one request
  const dropEntities = async (
    entities: LibraryEntity[],
    targetFolderId: FolderId | undefined,
  ) => {
    if (!canManage) throw new Error("You do not have permission to move files");

    let movedCount = 0;
    for (const entity of entities) {
      if (entity.kind === "folder") {
        if (!actions.moveFolder) {
          throw new Error("Moving folders is not available for this library");
        }
        if ((entity.folder.parentId ?? undefined) === targetFolderId) continue;
        await actions.moveFolder(entity.folder._id, targetFolderId);
        if (currentFolderId === entity.folder._id) {
          setCurrentFolderId(entity.folder._id);
        }
      } else {
        if (!actions.moveFile) {
          throw new Error("Moving files is not available for this library");
        }
        if ((entity.file.folderId ?? undefined) === targetFolderId) continue;
        await actions.moveFile(entity.file._id, targetFolderId);
        if (
          openEntity?.kind === "file" &&
          openEntity.file._id === entity.file._id
        ) {
          setCurrentFolderId(targetFolderId ?? null);
        }
      }
      movedCount += 1;
    }

    if (movedCount > 0) toast.success(tExplorer("toastMoved"));
  };

  const downloadFile = (file: LibraryFile) => {
    const link = document.createElement("a");
    link.href = file.downloadUrl;
    link.download = file.filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renameEntity = async (entity: LibraryEntity, name: string) => {
    if (entity.kind === "folder") {
      await actions.renameFolder?.(entity.folder._id, name);
    } else {
      await actions.renameFile?.(entity.file._id, name);
    }
    toast.success(tExplorer("toastRenamed"));
  };

  const moveEntity = (entity: LibraryEntity) => {
    setMoveTarget(
      entity.kind === "folder"
        ? { kind: "folder", id: entity.folder._id, name: entity.folder.name }
        : { kind: "file", id: entity.file._id, name: entity.file.filename },
    );
  };

  const deleteEntity = (entity: LibraryEntity) => {
    setDeleteTarget(
      entity.kind === "folder"
        ? { kind: "folder", id: entity.folder._id, name: entity.folder.name }
        : { kind: "file", id: entity.file._id, name: entity.file.filename },
    );
  };

  if (data.isLoading) {
    return <LibraryExplorerSkeleton className={className} />;
  }

  if (!data.library) {
    return (
      <div
        className={cn(
          "flex min-h-72 items-center justify-center rounded-lg border bg-background text-sm text-muted-foreground",
          className,
        )}
      >
        Library not found
      </div>
    );
  }

  const tree = (
    <LibraryTree
      allowDownloads={options.allowDownloads}
      canManage={canManage}
      currentFolderId={currentFolderId}
      currentFolderPath={
        currentFolderId
          ? (model.folderPathById.get(currentFolderId) ?? null)
          : null
      }
      entities={model.entitiesByTreePath}
      onCreateFolder={createFolder}
      onDeleteEntity={deleteEntity}
      onDownloadFile={(entity) => {
        if (entity.kind === "file") downloadFile(entity.file);
      }}
      onCopyLink={(entity) => void copyEntityLink(entity)}
      onDropEntities={
        canManage && actions.moveFile && actions.moveFolder
          ? (entities, targetFolderId) =>
              dropEntities(entities, targetFolderId).catch((error) => {
                toast.error(
                  error instanceof Error ? error.message : "Move failed",
                );
                throw error;
              })
          : undefined
      }
      paths={model.treePaths}
      onOpenEntity={openEntityInExplorer}
      onMoveEntity={moveEntity}
      onRenameEntity={renameEntity}
      onUploadFiles={() => fileInputRef.current?.click()}
      title={options.embedded ? data.library.name : undefined}
      uploadDisabled={uploadState?.isAnyUploading}
    />
  );
  const fileViewer = openFile ? (
    <SplitViewShell
      className="min-h-0 flex-1"
      detail={
        <LibraryFileViewer
          key={openFile._id}
          allowDownloads={options.allowDownloads}
          file={openFile}
          onClose={() => {
            setOpenFilePath(null);
            syncFileUrl(null);
          }}
          onOpenTree={() => setTreeDrawerOpen(true)}
        />
      }
      detailCollapsedOnMobile
      detailDefaultSize={64}
      detailSurfaceClassName="rounded-none border-0 bg-transparent shadow-none backdrop-blur-none"
      main={tree}
      mainDefaultSize={36}
      mainPanelClassName="border-r"
      minDetailSize={38}
      minMainSize={24}
      visibleHandle
    />
  ) : (
    <div className="min-h-0 flex-1">{tree}</div>
  );
  return (
    <>
      <UploadDropzone
        disabled={!canManage || !actions.uploadFiles}
        isUploading={uploadState?.isAnyUploading ?? false}
        uploadPercent={uploadState?.totalProgress?.percentage ?? null}
        uploadingLabel={tExplorer("dropzoneUploading")}
        onFilesAccepted={uploadFiles}
        className={cn(
          "flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-lg border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          options.embedded ? "h-[32rem]" : "h-full flex-1",
          className,
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void uploadFiles(files);
            event.target.value = "";
          }}
        />
        {fileViewer}
      </UploadDropzone>

      <Drawer open={treeDrawerOpen} onOpenChange={setTreeDrawerOpen}>
        <DrawerContent className="max-h-[75dvh]">
          <DrawerTitle className="sr-only">Library files</DrawerTitle>
          <div className="h-[70dvh] pt-3">{tree}</div>
        </DrawerContent>
      </Drawer>

      <DeleteItemDialog
        target={deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={deleteItem}
      />
      <MoveItemDialog
        folders={data.folders}
        target={moveTarget}
        onOpenChange={(open) => !open && setMoveTarget(null)}
        onSubmit={moveItem}
      />
    </>
  );
}

function LibraryExplorerSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[28rem] flex-col overflow-hidden rounded-lg border bg-background",
        className,
      )}
    >
      <div className="flex min-h-12 items-center gap-3 border-b px-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <div className="space-y-2 p-3">
        {skeletonRows.map((id) => (
          <Skeleton key={id} className="h-11 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}
