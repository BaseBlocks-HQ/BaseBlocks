"use client";

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
import { Drawer, DrawerContent, DrawerTitle } from "@baseblocks/ui/drawer";
import { Skeleton } from "@baseblocks/ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DeleteItemDialog, MoveItemDialog } from "./library-dialogs";
import { LibraryFileViewer } from "./library-file-viewer";
import { LibraryTree } from "./library-tree";
import { UploadDropzone } from "./upload-dropzone";
import { UploadProgressList } from "./upload-progress";

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
  uploadState?: {
    clearAllUploadStates: () => void;
    isAnyUploading: boolean;
    uploadStates: Record<string, unknown>;
  };
}) {
  const [currentFolderId, setCurrentFolderId] = useState<FolderId | null>(null);
  const [openFilePath, setOpenFilePath] = useState<string | null>(null);
  const [treeDrawerOpen, setTreeDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LibraryDialogTarget | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<LibraryDialogTarget | null>(
    null,
  );
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);

  const canManage = options.access === "manage";
  const model = useMemo(
    () => buildLibraryEntityMap(data.folders, data.files),
    [data.folders, data.files],
  );
  const openEntity = openFilePath ? model.entities.get(openFilePath) : null;
  const openFile = openEntity?.kind === "file" ? openEntity.file : null;

  const openEntityInExplorer = (entity: LibraryEntity) => {
    if (entity.kind === "folder") {
      setCurrentFolderId(entity.folder._id);
      setOpenFilePath(null);
    } else {
      setOpenFilePath(entity.path);
      setCurrentFolderId(entity.file.folderId ?? null);
    }
    setTreeDrawerOpen(false);
  };

  const uploadFiles = async (files: File[]) => {
    const upload = actions.uploadFiles;
    if (!upload) return;

    const targetFolderId = currentFolderId ?? undefined;
    try {
      await upload(files, targetFolderId);
      toast.success("Uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
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
    toast.success("Deleted");
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
    toast.success("Moved");
  };

  const createFolder = async (name: string, parentId?: FolderId) => {
    await actions.createFolder?.(name, parentId);
    toast.success("Folder created");
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

    if (movedCount > 0) toast.success("Moved");
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
    toast.success("Renamed");
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

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handlePointerMove = (event: PointerEvent) => {
      const left = splitRef.current?.getBoundingClientRect().left ?? 0;
      setSidebarWidth(Math.min(520, Math.max(280, event.clientX - left)));
    };
    const stopResizing = () => setIsResizingSidebar(false);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing, { once: true });
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

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
      onDropEntities={
        canManage && actions.moveFile && actions.moveFolder
          ? async (entities, targetFolderId) => {
              try {
                await dropEntities(entities, targetFolderId);
              } catch (error) {
                toast.error(
                  error instanceof Error ? error.message : "Move failed",
                );
                throw error;
              }
            }
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
    <div ref={splitRef} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <aside
        className="hidden min-h-0 min-w-[280px] max-w-[520px] shrink-0 overflow-hidden md:block"
        style={{ width: sidebarWidth }}
      >
        {tree}
      </aside>
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden border-l"
        style={{ maxWidth: "100%" }}
      >
        <button
          type="button"
          aria-label="Resize file tree"
          className="group absolute inset-y-0 left-0 z-10 hidden w-3 cursor-col-resize items-center justify-center bg-transparent focus-visible:outline-none md:flex"
          onPointerDown={(event) => {
            event.preventDefault();
            setIsResizingSidebar(true);
          }}
        >
          <span
            className={cn(
              "h-10 w-px translate-x-px rounded-full bg-muted-foreground/20 transition-[background-color,height]",
              "group-hover:h-20 group-hover:bg-primary/40 group-focus-visible:h-20 group-focus-visible:bg-primary/50",
              isResizingSidebar && "h-24 bg-primary/60",
            )}
          />
        </button>
        <LibraryFileViewer
          key={openFile._id}
          allowDownloads={options.allowDownloads}
          file={openFile}
          onClose={() => setOpenFilePath(null)}
          onOpenTree={() => setTreeDrawerOpen(true)}
        />
      </div>
    </div>
  ) : (
    <div className="min-h-0 flex-1">{tree}</div>
  );
  return (
    <>
      <UploadDropzone
        disabled={!canManage || !actions.uploadFiles}
        onFilesAccepted={uploadFiles}
        className={cn(
          "flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-lg border border-solid border-muted-foreground/25 bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-primary/30 hover:bg-primary/5",
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
        {uploadState && Object.keys(uploadState.uploadStates).length > 0 ? (
          <div className="border-b px-3 py-2">
            <UploadProgressList
              uploads={uploadState.uploadStates as never}
              onDismiss={uploadState.clearAllUploadStates}
            />
          </div>
        ) : null}
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
