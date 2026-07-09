"use client";

import {
  FILE_SEARCH_PARAM,
  buildFileDeepLinkPath,
  toAbsoluteBrowserUrl,
} from "@/modules/document-library/deep-link";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  FilePreview,
  ToolbarButton,
  type PreviewFile,
} from "@/modules/file-preview";
import type {
  FolderId,
  LibraryDialogTarget,
  LibraryEntity,
  LibraryExplorerPayload,
  LibraryFile,
} from "@/modules/document-library/tree-input";
import { buildLibraryTreeInput } from "@/modules/document-library/tree-input";
import { useFileUpload } from "@/modules/document-library/use-document-upload";
import { api } from "@baseblocks/backend";
import { Drawer, DrawerContent, DrawerTitle } from "@baseblocks/ui/drawer";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { Spinner } from "@baseblocks/ui/spinner";
import { useMutation } from "convex/react";
import { Loader2, PanelLeft, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { DeleteItemDialog, MoveItemDialog } from "./library-dialogs";
import { LibraryTree } from "./library-tree";

const librarySplitHandleClassName =
  "group/split-handle relative z-20 -mx-1 flex !w-2 shrink-0 items-stretch justify-center bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border/80 before:transition-colors before:duration-150 hover:before:bg-ring/55 data-[resize-handle-state=drag]:before:bg-ring after:pointer-events-none after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2 after:bg-transparent";
const maxUploadFileSize = 50 * 1024 * 1024;

function UploadDropzone({
  children,
  className,
  disabled,
  isUploading = false,
  onFilesAccepted,
  uploadPercent = null,
  uploadingLabel,
}: {
  children: ReactNode;
  className?: string;
  disabled: boolean;
  isUploading?: boolean;
  onFilesAccepted?: (files: File[]) => void;
  uploadPercent?: number | null;
  uploadingLabel: string;
}) {
  const { getInputProps, getRootProps, isDragActive, isDragReject } =
    useDropzone({
      disabled,
      maxSize: maxUploadFileSize,
      multiple: true,
      noClick: true,
      useFsAccessApi: false,
      onDrop: (acceptedFiles) => {
        if (acceptedFiles.length > 0) onFilesAccepted?.(acceptedFiles);
      },
    });

  return (
    <div
      {...getRootProps()}
      className={cn("relative min-h-0 outline-none", className)}
    >
      <input {...getInputProps()} />
      {children}
      {isDragActive ? (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 z-40 rounded-[inherit] ring-2 ring-inset ring-primary/35 transition-[box-shadow] duration-150",
            isDragReject && "ring-destructive/50",
          )}
        >
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
            <div
              className={cn(
                "flex max-w-full items-center gap-2 rounded-full border bg-popover/95 px-3.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md backdrop-blur-sm",
                isDragReject
                  ? "border-destructive/25 text-destructive"
                  : "border-border/80",
              )}
            >
              {isDragReject ? (
                <X className="h-3.5 w-3.5 shrink-0 opacity-90" />
              ) : (
                <Upload className="h-3.5 w-3.5 shrink-0 text-primary opacity-90" />
              )}
              <span className="truncate">
                {isDragReject ? "File is too large" : "Drop to upload"}
              </span>
            </div>
          </div>
        </div>
      ) : isUploading ? (
        <div
          className="pointer-events-none absolute inset-0 z-40 rounded-[inherit] bg-primary/[0.04] ring-1 ring-inset ring-primary/15 animate-in fade-in-0 duration-200"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="absolute inset-x-0 bottom-3 flex justify-center px-3">
            <div className="flex min-w-[11.5rem] max-w-[min(100%,20rem)] flex-col gap-2 rounded-2xl border border-border/80 bg-popover/95 px-3.5 py-2.5 text-xs text-popover-foreground shadow-md backdrop-blur-sm">
              <div className="flex items-center gap-2.5 font-medium tabular-nums">
                <Loader2
                  className="h-3.5 w-3.5 shrink-0 animate-spin text-primary"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">
                  {uploadingLabel}
                </span>
                {uploadPercent != null ? (
                  <span className="shrink-0 text-muted-foreground">
                    {uploadPercent}%
                  </span>
                ) : null}
              </div>
              <div className="relative h-1 overflow-hidden rounded-full bg-muted/80">
                {uploadPercent != null ? (
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, uploadPercent))}%`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-y-0 left-0 w-[38%] rounded-full bg-primary/55 [animation:library-upload-shimmer_1.15s_ease-in-out_infinite] motion-reduce:[animation:none] motion-reduce:opacity-70" />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function LibraryExplorer({
  className,
  explorer,
  access,
  allowDownloads,
  embedded,
}: {
  className?: string;
  explorer: LibraryExplorerPayload | null | undefined;
  access: "manage" | "read";
  allowDownloads: boolean;
  embedded?: boolean;
}) {
  const tExplorer = useTranslations("libraries.explorer");
  const isMobile = useIsMobile();
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
  const createFolderMutation = useMutation(api.libraries.createFolder);
  const updateFolder = useMutation(api.libraries.updateFolder);
  const moveFolderMutation = useMutation(api.libraries.moveFolder);
  const removeFolder = useMutation(api.libraries.removeFolder);
  const renameDocument = useMutation(api.documents.rename);
  const moveDocument = useMutation(api.documents.move);
  const removeDocument = useMutation(api.documents.remove);
  const {
    uploadFiles: uploadLibraryFiles,
    isAnyUploading,
    clearAllUploadStates,
    totalProgress,
  } = useFileUpload();

  const canManage = access === "manage";
  const model = useMemo(
    () => buildLibraryTreeInput(explorer?.folders ?? [], explorer?.files ?? []),
    [explorer?.folders, explorer?.files],
  );
  const openEntity = openFilePath ? model.entityByPath.get(openFilePath) : null;
  const openFile = openEntity?.kind === "file" ? openEntity.file : null;
  const selectedFileId = searchParams.get(FILE_SEARCH_PARAM);

  useEffect(() => {
    if (!selectedFileId) return;

    const entity = model.entityByFileId.get(selectedFileId);
    if (entity?.kind === "file") {
      setOpenFilePath(entity.path);
      setCurrentFolderId(entity.file.folderId ?? null);
    }
  }, [model.entityByFileId, selectedFileId]);

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
    if (!canManage || !explorer || files.length === 0) return;

    const targetFolderId = currentFolderId ?? undefined;
    const count = files.length;
    const primaryName = files[0]?.name ?? "";

    const toastId = toast.loading(
      count === 1
        ? tExplorer("toastUploading", { name: primaryName })
        : tExplorer("toastUploadingCount", { count }),
    );

    const results = await uploadLibraryFiles(files, {
      siteId: explorer.site._id,
      libraryId: explorer.library._id,
      folderId: targetFolderId,
    })
      .catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : tExplorer("toastUploadFailed"),
          { id: toastId },
        );
        return null;
      })
      .finally(() => {
        clearAllUploadStates();
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
      await removeFolder({ folderId: target.id });
      if (currentFolderId === target.id) {
        setCurrentFolderId(null);
      }
    } else {
      await removeDocument({ documentId: target.id });
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
      await moveFolderMutation({
        folderId: target.id,
        newParentId: targetFolderId,
      });
      if (currentFolderId === target.id) {
        setCurrentFolderId(target.id);
      }
    } else {
      await moveDocument({ documentId: target.id, folderId: targetFolderId });
      if (openEntity?.kind === "file" && openEntity.file._id === target.id) {
        setCurrentFolderId(targetFolderId ?? null);
      }
    }
    toast.success(tExplorer("toastMoved"));
  };

  const createFolder = async (name: string, parentId?: FolderId) => {
    if (!explorer) return;
    await createFolderMutation({
      libraryId: explorer.library._id,
      parentId,
      name,
    });
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
        if ((entity.folder.parentId ?? undefined) === targetFolderId) continue;
        await moveFolderMutation({
          folderId: entity.folder._id,
          newParentId: targetFolderId,
        });
        if (currentFolderId === entity.folder._id) {
          setCurrentFolderId(entity.folder._id);
        }
      } else {
        if ((entity.file.folderId ?? undefined) === targetFolderId) continue;
        await moveDocument({
          documentId: entity.file._id,
          folderId: targetFolderId,
        });
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
      await updateFolder({ folderId: entity.folder._id, name });
    } else {
      await renameDocument({ documentId: entity.file._id, filename: name });
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

  if (explorer === undefined) {
    return <LibraryExplorerLoading className={className} />;
  }

  if (!explorer) {
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
      allowDownloads={allowDownloads}
      canManage={canManage}
      currentFolderId={currentFolderId}
      entities={model.entityByPath}
      onCreateFolder={createFolder}
      onDeleteEntity={deleteEntity}
      onDownloadFile={(entity) => {
        if (entity.kind === "file") downloadFile(entity.file);
      }}
      onCopyLink={(entity) => void copyEntityLink(entity)}
      onDropEntities={
        canManage
          ? (entities, targetFolderId) =>
              dropEntities(entities, targetFolderId).catch((error) => {
                toast.error(
                  error instanceof Error ? error.message : "Move failed",
                );
                throw error;
              })
          : undefined
      }
      paths={model.paths}
      onOpenEntity={openEntityInExplorer}
      onMoveEntity={moveEntity}
      onRenameEntity={renameEntity}
      onUploadFiles={() => fileInputRef.current?.click()}
      title={embedded ? explorer.library.name : undefined}
      uploadDisabled={isAnyUploading}
    />
  );
  const previewFile: PreviewFile | null = openFile
    ? {
        url: openFile.downloadUrl,
        filename: openFile.filename,
        contentType: openFile.contentType,
        size: openFile.size,
        allowDownload: allowDownloads,
        deepLinkId: openFile._id,
      }
    : null;
  const closeFilePreview = () => {
    setOpenFilePath(null);
    syncFileUrl(null);
  };
  const fileViewerContent = previewFile ? (
    <FilePreview
      key={previewFile.deepLinkId ?? previewFile.url}
      file={previewFile}
      mode="embedded"
      onClose={closeFilePreview}
      leadingActions={
        <div className="md:hidden">
          <ToolbarButton label="Files" onClick={() => setTreeDrawerOpen(true)}>
            <PanelLeft className="h-4 w-4" />
          </ToolbarButton>
        </div>
      }
    />
  ) : null;
  const fileViewer = openFile ? (
    isMobile ? (
      <div className="min-h-0 flex-1">{fileViewerContent}</div>
    ) : (
      <ResizablePanelGroup className="min-h-0 flex-1" orientation="horizontal">
        <ResizablePanel defaultSize={36} minSize={24}>
          <div className="h-full min-h-0 min-w-0 overflow-hidden border-r">
            {tree}
          </div>
        </ResizablePanel>
        <ResizableHandle className={librarySplitHandleClassName} />
        <ResizablePanel defaultSize={64} minSize={38}>
          <div className="h-full min-h-0 min-w-0">{fileViewerContent}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    )
  ) : (
    <div className="min-h-0 flex-1">{tree}</div>
  );
  return (
    <>
      <UploadDropzone
        disabled={!canManage || !explorer}
        isUploading={isAnyUploading}
        uploadPercent={totalProgress?.percentage ?? null}
        uploadingLabel={tExplorer("dropzoneUploading")}
        onFilesAccepted={uploadFiles}
        className={cn(
          "flex min-h-[28rem] min-w-0 flex-col overflow-hidden rounded-lg border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          embedded ? "h-[32rem]" : "h-full flex-1",
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
        folders={explorer.folders}
        target={moveTarget}
        onOpenChange={(open) => !open && setMoveTarget(null)}
        onSubmit={moveItem}
      />
    </>
  );
}

function LibraryExplorerLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[28rem] items-center justify-center rounded-lg border bg-background",
        className,
      )}
    >
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
