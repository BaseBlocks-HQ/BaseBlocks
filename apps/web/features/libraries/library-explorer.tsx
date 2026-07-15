"use client";

import {
  LIBRARY_FILE_SEARCH_PARAM,
  buildLibraryExplorerModel,
  buildLibraryFilePath,
} from "@/features/libraries/model";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  FilePreview,
  ToolbarButton,
  type PreviewFile,
} from "@/components/file-viewer/file-viewer";
import type {
  FolderId,
  FileId,
  LibraryDialogTarget,
  LibraryEntity,
  LibraryExplorerPayload,
  LibraryFile,
} from "@/features/libraries/model";
import { deleteFile } from "@/lib/files/client";
import { fileRegistration, filesClient } from "@/lib/files/upload";
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
import { type ReactNode, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { DeleteItemDialog } from "./library-dialogs";
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
  allowDownloads,
  embedded,
}: {
  className?: string;
  explorer: LibraryExplorerPayload | null | undefined;
  allowDownloads: boolean;
  embedded?: boolean;
}) {
  const tExplorer = useTranslations("libraries.explorer");
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentFolderId, setCurrentFolderId] = useState<FolderId | null>(null);
  const [openFileId, setOpenFileId] = useState<FileId | null>(null);
  const [treeDrawerOpen, setTreeDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LibraryDialogTarget | null>(
    null,
  );
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createFolderMutation = useMutation(api.libraries.createFolder);
  const updateFolder = useMutation(api.libraries.updateFolder);
  const moveEntity = useMutation(api.libraries.moveInTree);
  const removeFolder = useMutation(api.libraries.removeFolder);
  const renameFile = useMutation(api.files.rename);
  const createFile = useMutation(api.files.create);

  const canManage = true;
  const model = buildLibraryExplorerModel(
    explorer?.folders ?? [],
    explorer?.files ?? [],
  );
  const openEntity = openFileId ? model.entityById.get(openFileId) : null;
  const openFile = openEntity?.kind === "file" ? openEntity.file : null;
  const selectedFileId = searchParams.get(
    LIBRARY_FILE_SEARCH_PARAM,
  ) as FileId | null;

  useEffect(() => {
    if (!selectedFileId) return;

    const entity = model.entityByFileId.get(selectedFileId);
    if (entity?.kind === "file") {
      setOpenFileId(entity.file._id);
      setCurrentFolderId(entity.file.folderId ?? null);
    }
  }, [model.entityByFileId, selectedFileId]);

  const syncFileUrl = (fileId: string | null) => {
    const nextUrl = buildLibraryFilePath(
      pathname,
      searchParams.toString(),
      fileId,
    );
    router.replace(nextUrl, { scroll: false });
  };

  const copyEntityLink = async (entity: LibraryEntity) => {
    if (entity.kind !== "file") return;

    const sharePath = buildLibraryFilePath(
      pathname,
      searchParams.toString(),
      entity.file._id,
    );
    await navigator.clipboard.writeText(
      new URL(sharePath, window.location.origin).toString(),
    );
    toast.success("Link copied");
  };

  const openEntityInExplorer = (entity: LibraryEntity) => {
    if (entity.kind === "folder") {
      setCurrentFolderId(entity.folder._id);
      setOpenFileId(null);
      syncFileUrl(null);
    } else {
      setOpenFileId(entity.file._id);
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
    const loadedByFile = new Map(files.map((file) => [file, 0]));
    const totalBytes = files.reduce((total, file) => total + file.size, 0);

    const toastId = toast.loading(
      count === 1
        ? tExplorer("toastUploading", { name: primaryName })
        : tExplorer("toastUploadingCount", { count }),
    );

    setUploadPercent(0);
    const results = await Promise.all(
      files.map(async (file) => {
        try {
          const { registered } = await filesClient.uploadAndRegister(
            file,
            {
              siteId: explorer.site._id,
              purpose: "file",
              onProgress: ({ loaded }) => {
                loadedByFile.set(file, loaded);
                const totalLoaded = [...loadedByFile.values()].reduce(
                  (total, value) => total + value,
                  0,
                );
                setUploadPercent(
                  totalBytes > 0
                    ? Math.round((totalLoaded / totalBytes) * 100)
                    : 100,
                );
              },
            },
            (upload) =>
              createFile({
                siteId: explorer.site._id,
                libraryId: explorer.library._id,
                folderId: targetFolderId,
                ...fileRegistration(file, upload),
              }),
          );
          return registered;
        } catch {
          return null;
        }
      }),
    ).finally(() => setUploadPercent(null));

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
      await deleteFile(target.id);
      if (openEntity?.kind === "file" && openEntity.file._id === target.id) {
        setOpenFileId(null);
      }
    }
    toast.success(tExplorer("toastDeleted"));
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
      await renameFile({ fileId: entity.file._id, filename: name });
    }
    toast.success(tExplorer("toastRenamed"));
  };

  const deleteEntity = (entity: LibraryEntity) => {
    setDeleteTarget(
      entity.kind === "folder"
        ? { kind: "folder", id: entity.folder._id, name: entity.folder.name }
        : { kind: "file", id: entity.file._id, name: entity.file.filename },
    );
  };

  if (explorer === undefined) {
    return <LibraryExplorerLoading className={className} embedded={embedded} />;
  }

  if (!explorer) {
    return (
      <div
        className={cn(
          "flex min-h-72 items-center justify-center text-sm text-muted-foreground",
          embedded ? "rounded-2xl bg-card" : "rounded-lg border bg-background",
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
      nodes={model.nodes}
      onCreateFolder={createFolder}
      onDeleteEntity={deleteEntity}
      onDownloadFile={(entity) => {
        if (entity.kind === "file") downloadFile(entity.file);
      }}
      onCopyLink={(entity) => void copyEntityLink(entity)}
      onOpenEntity={openEntityInExplorer}
      onMoveEntity={async ({ entityId, placement, targetId }) => {
        await moveEntity({
          libraryId: explorer.library._id,
          entityId,
          targetId: targetId ?? undefined,
          placement,
        });
      }}
      onRenameEntity={renameEntity}
      onUploadFiles={() => fileInputRef.current?.click()}
      title={explorer.library.name}
      uploadDisabled={uploadPercent !== null}
    />
  );
  const previewFile: PreviewFile | null = openFile
    ? {
        url: openFile.downloadUrl,
        filename: openFile.filename,
        contentType: openFile.contentType,
        size: openFile.size,
        allowDownload: allowDownloads,
      }
    : null;
  const closeFilePreview = () => {
    setOpenFileId(null);
    syncFileUrl(null);
  };
  const fileViewerContent = previewFile ? (
    <FilePreview
      key={previewFile.url}
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
        isUploading={uploadPercent !== null}
        uploadPercent={uploadPercent}
        uploadingLabel={tExplorer("dropzoneUploading")}
        onFilesAccepted={uploadFiles}
        className={cn(
          "flex min-h-[28rem] min-w-0 flex-col overflow-hidden",
          embedded
            ? "h-[32rem] rounded-2xl bg-card"
            : "h-full flex-1 rounded-lg border bg-background shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
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
    </>
  );
}

function LibraryExplorerLoading({
  className,
  embedded,
}: {
  className?: string;
  embedded?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[28rem] items-center justify-center",
        embedded ? "rounded-2xl bg-card" : "rounded-lg border bg-background",
        className,
      )}
    >
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
