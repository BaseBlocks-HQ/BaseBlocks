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
import {
  CreateFolderDialog,
  DeleteItemDialog,
  MoveItemDialog,
  RenameItemDialog,
} from "./library-dialogs";
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
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<LibraryDialogTarget | null>(
    null,
  );
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
    try {
      await actions.uploadFiles?.(files, currentFolderId ?? undefined);
      toast.success("Uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const renameItem = async (target: LibraryDialogTarget, name: string) => {
    if (target.kind === "folder") {
      await actions.renameFolder?.(target.id, name);
    } else {
      await actions.renameFile?.(target.id, name);
    }
    toast.success("Renamed");
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

  const createFolder = async (name: string) => {
    await actions.createFolder?.(name, currentFolderId ?? undefined);
    toast.success("Folder created");
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

  const renameEntity = (entity: LibraryEntity) => {
    setRenameTarget(
      entity.kind === "folder"
        ? { kind: "folder", id: entity.folder._id, name: entity.folder.name }
        : { kind: "file", id: entity.file._id, name: entity.file.filename },
    );
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
      entities={model.entitiesByTreePath}
      onCreateFolder={() => setCreateFolderOpen(true)}
      onDeleteEntity={deleteEntity}
      onDownloadFile={(entity) => {
        if (entity.kind === "file") downloadFile(entity.file);
      }}
      paths={model.treePaths}
      onOpenEntity={openEntityInExplorer}
      onMoveEntity={moveEntity}
      onRenameEntity={renameEntity}
      onUploadFiles={() => fileInputRef.current?.click()}
      uploadDisabled={uploadState?.isAnyUploading}
    />
  );

  const fileViewer = openFile ? (
    <div ref={splitRef} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
      <aside
        className="hidden min-h-0 min-w-[280px] max-w-[520px] shrink-0 overflow-hidden border-r md:block"
        style={{ width: sidebarWidth }}
      >
        {tree}
      </aside>
      <button
        type="button"
        aria-label="Resize file tree"
        className="hidden w-1 shrink-0 cursor-col-resize bg-border transition-colors hover:bg-ring focus-visible:bg-ring focus-visible:outline-none md:block"
        onPointerDown={(event) => {
          event.preventDefault();
          setIsResizingSidebar(true);
        }}
      />
      <div
        className="min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ maxWidth: "100%" }}
      >
        <LibraryFileViewer
          allowDownloads={options.allowDownloads}
          file={openFile}
          onClose={() => setOpenFilePath(null)}
          onDelete={
            canManage && actions.deleteFile
              ? () =>
                  setDeleteTarget({
                    kind: "file",
                    id: openFile._id,
                    name: openFile.filename,
                  })
              : undefined
          }
          onMove={
            canManage && actions.moveFile
              ? () =>
                  setMoveTarget({
                    kind: "file",
                    id: openFile._id,
                    name: openFile.filename,
                  })
              : undefined
          }
          onOpenTree={() => setTreeDrawerOpen(true)}
          onRename={
            canManage && actions.renameFile
              ? () =>
                  setRenameTarget({
                    kind: "file",
                    id: openFile._id,
                    name: openFile.filename,
                  })
              : undefined
          }
        />
      </div>
    </div>
  ) : (
    <div className="min-h-0 flex-1">{tree}</div>
  );
  const embeddedHeader = options.embedded ? (
    <div className="flex min-h-10 items-center gap-2 border-b bg-background px-3">
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-sm font-medium" title={data.library.name}>
          {data.library.name}
        </h2>
      </div>
      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
        {data.files.length === 1
          ? "1 file"
          : `${data.files.length.toLocaleString()} files`}
      </span>
    </div>
  ) : null;

  return (
    <>
      <UploadDropzone
        disabled={!canManage || !actions.uploadFiles}
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
        {embeddedHeader}
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

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSubmit={createFolder}
      />
      <RenameItemDialog
        target={renameTarget}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        onSubmit={renameItem}
      />
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
