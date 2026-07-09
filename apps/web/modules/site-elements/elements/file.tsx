"use client";

import {
  FILE_SEARCH_PARAM,
  buildFileDeepLinkPath,
  toAbsoluteBrowserUrl,
} from "@/modules/document-library/deep-link";
import { useFileUpload } from "@/modules/files";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  FilePreview as FilePreviewPanel,
  type PreviewFile,
} from "@/modules/file-preview";
import { DropZone, FileIcon, getFileTypeColor } from "@/modules/file-ui";
import { useEditorSite } from "@/modules/editor/editor-state";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@baseblocks/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import { useMutation, useQuery } from "convex/react";
import {
  Eye,
  FileUp,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import type { ElementEditorProps } from "../registry";

interface FileData {
  _id: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt?: number;
  downloadUrl: string;
}

interface FileEditorState {
  deleteDialogOpen: boolean;
  renameDialogOpen: boolean;
  renameValue: string;
}

type FileEditorAction =
  | { type: "closeDeleteDialog" }
  | { type: "closeRenameDialog" }
  | { type: "openDeleteDialog" }
  | { type: "openRenameDialog"; value: string }
  | { type: "setRenameValue"; value: string };

const emptyFileEditorState: FileEditorState = {
  deleteDialogOpen: false,
  renameDialogOpen: false,
  renameValue: "",
};

function fileEditorReducer(
  state: FileEditorState,
  action: FileEditorAction,
): FileEditorState {
  switch (action.type) {
    case "closeDeleteDialog":
      return { ...state, deleteDialogOpen: false };
    case "closeRenameDialog":
      return { ...state, renameDialogOpen: false, renameValue: "" };
    case "openDeleteDialog":
      return { ...state, deleteDialogOpen: true };
    case "openRenameDialog":
      return {
        ...state,
        renameDialogOpen: true,
        renameValue: action.value,
      };
    case "setRenameValue":
      return { ...state, renameValue: action.value };
    default:
      return state;
  }
}

function getDocumentUrl(documentId: string) {
  return `/api/storage/documents/${documentId}`;
}

function getContentSnapshot(
  content: ElementEditorProps<"file">["content"],
): FileData | null {
  if (
    !content.documentId ||
    !content.filename ||
    !content.contentType ||
    typeof content.size !== "number"
  ) {
    return null;
  }

  return {
    _id: content.documentId,
    filename: content.filename,
    contentType: content.contentType,
    size: content.size,
    createdAt: content.createdAt,
    downloadUrl: getDocumentUrl(content.documentId),
  };
}

function getFileContent(file: FileData) {
  return {
    documentId: file._id,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    createdAt: file.createdAt,
  };
}

function toPreviewFile(file: FileData, deepLinkId?: string): PreviewFile {
  return {
    url: file.downloadUrl,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    deepLinkId,
  };
}

function FileUploadState({
  isUploading,
  onFilesAccepted,
  uploadProgress,
}: {
  isUploading: boolean;
  onFilesAccepted: (files: File[]) => void;
  uploadProgress: number;
}) {
  const t = useTranslations("elements.file");
  return (
    <DropZone
      onFilesAccepted={onFilesAccepted}
      disabled={isUploading}
      className="rounded-md border border-solid bg-card/70 p-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {isUploading
                ? t("uploading", { progress: uploadProgress })
                : t("uploadFile")}
            </p>
          </div>
        </div>
        <span className="inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground">
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          {t("upload")}
        </span>
      </div>
    </DropZone>
  );
}

function FileItemMenu({
  onCopyLink,
  onDelete,
  onOpen,
  onRename,
  onPreview,
  readOnly = false,
}: {
  onCopyLink?: () => void;
  onDelete?: () => void;
  onOpen?: () => void;
  onPreview?: () => void;
  onRename?: () => void;
  readOnly?: boolean;
}) {
  const t = useTranslations("elements.file");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {onOpen ? (
          <DropdownMenuItem onClick={onOpen}>
            <Eye className="mr-2 h-4 w-4" />
            Open
          </DropdownMenuItem>
        ) : null}
        {!onOpen && onPreview ? (
          <DropdownMenuItem onClick={onPreview}>
            <Eye className="mr-2 h-4 w-4" />
            {t("preview")}
          </DropdownMenuItem>
        ) : null}
        {onCopyLink ? (
          <DropdownMenuItem onClick={onCopyLink}>
            <LinkIcon className="mr-2 h-4 w-4" />
            Copy link
          </DropdownMenuItem>
        ) : null}
        {!readOnly && onRename ? (
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="mr-2 h-4 w-4" />
            {t("rename")}
          </DropdownMenuItem>
        ) : null}
        {!readOnly && onDelete ? <DropdownMenuSeparator /> : null}
        {!readOnly && onDelete ? (
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("delete")}
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FileDialogs({
  deleteDialogOpen,
  filename,
  onCloseDelete,
  onCloseRename,
  onConfirmDelete,
  onConfirmRename,
  onRenameValueChange,
  renameDialogOpen,
  renameValue,
}: {
  deleteDialogOpen: boolean;
  filename: string;
  onCloseDelete: () => void;
  onCloseRename: () => void;
  onConfirmDelete: () => void;
  onConfirmRename: () => void;
  onRenameValueChange: (value: string) => void;
  renameDialogOpen: boolean;
  renameValue: string;
}) {
  const t = useTranslations("elements.file");
  const tCommon = useTranslations("common");

  return (
    <>
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(next) => {
          if (!next) onCloseRename();
        }}
      >
        <DialogContent
          className={`overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4 sm:max-w-md`}
        >
          <DialogHeader className={"px-5 pt-4 pb-0"}>
            <DialogTitle className={"text-base font-semibold"}>
              {t("renameTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className={"px-5 pb-3"}>
            <div>
              <Label
                htmlFor="file-rename-filename"
                className={
                  "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55"
                }
              >
                {t("renameFieldLabel")}
              </Label>
              <Input
                id="file-rename-filename"
                value={renameValue}
                onChange={(event) => onRenameValueChange(event.target.value)}
                onKeyDown={(event) =>
                  event.key === "Enter" && onConfirmRename()
                }
                className={
                  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent"
                }
              />
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onCloseRename}
                className="h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm"
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="button"
                onClick={onConfirmRename}
                disabled={!renameValue.trim()}
                className="h-8 rounded-full px-4 text-sm"
              >
                {t("renameConfirm")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(next) => {
          if (!next) onCloseDelete();
        }}
      >
        <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
          <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
            <AlertDialogTitle className="text-base font-semibold text-balance">
              {t("deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-sidebar-foreground/60">
              {t("deleteDescription", { filename })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
            <AlertDialogCancel
              size="sm"
              className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              {tCommon("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              size="sm"
              className="rounded-full px-4 text-sm"
              onClick={onConfirmDelete}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function SingleFileRow({
  actions,
  file,
  onOpen,
}: {
  actions?: ReactNode;
  file: FileData;
  onOpen?: () => void;
}) {
  return (
    <div className="group grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border bg-card/70 p-1.5">
      <button
        type="button"
        onClick={onOpen}
        className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-2.5 text-left"
      >
        <span
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md bg-muted/70",
            getFileTypeColor(file.contentType),
          )}
        >
          <FileIcon contentType={file.contentType} className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium leading-tight">
            {file.filename}
          </span>
          <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground/80 tabular-nums">
            {formatFileMeta(file)}
          </span>
        </span>
      </button>
      {actions}
    </div>
  );
}

function formatFileMeta(file: Pick<FileData, "size" | "createdAt">) {
  const parts = [formatFileSize(file.size)];
  if (file.createdAt) {
    parts.push(
      new Date(file.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    );
  }
  return parts.join(" • ");
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );
  return `${Number.parseFloat((bytes / 1024 ** index).toFixed(1))} ${units[index]}`;
}

function setFileSaveStatus(
  onSaveStatusChange: ElementEditorProps<"file">["onSaveStatusChange"],
  status: Parameters<
    NonNullable<ElementEditorProps<"file">["onSaveStatusChange"]>
  >[0],
) {
  if (onSaveStatusChange) {
    onSaveStatusChange(status);
  }
}

// Failure modes:
// - Upload can fail validation or network/server verification before a document exists.
// - A saved document id can point at a deleted document from another editor session.
// - Rename/delete must update both the document row and this block's stored snapshot.
export function FileEditor({
  content,
  onSaveStatusChange,
  onUpdate,
}: ElementEditorProps<"file">) {
  const t = useTranslations("elements.file");
  const { siteId } = useEditorSite();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uploadFile, isAnyUploading, totalProgress } = useFileUpload();
  const renameDocument = useMutation(api.documents.mutations.rename);
  const removeDocument = useMutation(api.documents.mutations.remove);
  const document = useQuery(
    api.documents.queries.get,
    content.documentId
      ? { documentId: content.documentId as Id<"documents"> }
      : "skip",
  );
  const [state, dispatch] = useReducer(fileEditorReducer, emptyFileEditorState);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const openedFromLinkRef = useRef<string | null>(null);
  const selectedFileId = searchParams.get(FILE_SEARCH_PARAM);

  const snapshot = getContentSnapshot(content);
  const resolvedFile =
    document === undefined
      ? snapshot
      : document
        ? ({
            _id: document._id,
            filename: document.filename,
            contentType: document.contentType,
            size: document.size,
            createdAt: document.createdAt,
            downloadUrl: document.downloadUrl,
          } satisfies FileData)
        : null;
  const isUploading = isAnyUploading;
  const uploadProgress = totalProgress?.percentage ?? 0;

  useEffect(() => {
    if (!resolvedFile) return;
    if (selectedFileId !== resolvedFile._id) return;
    if (openedFromLinkRef.current === selectedFileId) return;

    setPreviewFile(toPreviewFile(resolvedFile, resolvedFile._id));
    openedFromLinkRef.current = selectedFileId;
  }, [resolvedFile, selectedFileId]);

  const openPreview = (file: FileData) => {
    const nextUrl = buildFileDeepLinkPath(
      pathname,
      searchParams.toString(),
      file._id,
    );
    router.replace(nextUrl, { scroll: false });
    setPreviewFile(toPreviewFile(file, file._id));
  };

  const closePreview = useCallback(() => {
    if (previewFile?.deepLinkId) {
      const nextUrl = buildFileDeepLinkPath(
        pathname,
        searchParams.toString(),
        null,
      );
      router.replace(nextUrl, { scroll: false });
    }
    setPreviewFile(null);
  }, [pathname, previewFile?.deepLinkId, router, searchParams]);

  const handleFilesAccepted = async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setFileSaveStatus(onSaveStatusChange, "saving");
    const documentId = await uploadFile(file, {
      siteId: siteId as Id<"sites">,
      onError: (error) => toast.error(error.message),
    });

    if (!documentId) {
      setFileSaveStatus(onSaveStatusChange, "idle");
      return;
    }

    const nextFile: FileData = {
      _id: documentId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      createdAt: Date.now(),
      downloadUrl: getDocumentUrl(documentId),
    };

    await onUpdate(getFileContent(nextFile));
    toast.success(t("toastUploaded"));
    setFileSaveStatus(onSaveStatusChange, "saved");
  };

  const handleRename = async () => {
    if (!resolvedFile) return;

    const nextName = state.renameValue.trim();
    if (!nextName) return;

    try {
      setFileSaveStatus(onSaveStatusChange, "saving");
      await renameDocument({
        documentId: resolvedFile._id as Id<"documents">,
        filename: nextName,
      });
      await onUpdate(getFileContent({ ...resolvedFile, filename: nextName }));
      dispatch({ type: "closeRenameDialog" });
      toast.success(t("toastRenamed"));
      setFileSaveStatus(onSaveStatusChange, "saved");
    } catch {
      toast.error(t("toastRenameFailed"));
      setFileSaveStatus(onSaveStatusChange, "idle");
    }
  };

  const handleDelete = async () => {
    if (!resolvedFile) return;

    try {
      setFileSaveStatus(onSaveStatusChange, "saving");
      await removeDocument({ documentId: resolvedFile._id as Id<"documents"> });
      await onUpdate({});
      dispatch({ type: "closeDeleteDialog" });
      toast.success(t("toastDeleted"));
      setFileSaveStatus(onSaveStatusChange, "saved");
    } catch {
      toast.error(t("toastDeleteFailed"));
      setFileSaveStatus(onSaveStatusChange, "idle");
    }
  };

  if (!resolvedFile) {
    return (
      <FileUploadState
        isUploading={isUploading}
        onFilesAccepted={handleFilesAccepted}
        uploadProgress={uploadProgress}
      />
    );
  }

  return (
    <>
      <SingleFileRow
        file={resolvedFile}
        onOpen={() => openPreview(resolvedFile)}
        actions={
          <FileItemMenu
            onCopyLink={() => {
              const sharePath = buildFileDeepLinkPath(
                pathname,
                searchParams.toString(),
                resolvedFile._id,
              );
              void navigator.clipboard.writeText(
                toAbsoluteBrowserUrl(sharePath),
              );
              toast.success("Link copied");
            }}
            onDelete={() => dispatch({ type: "openDeleteDialog" })}
            onPreview={() => openPreview(resolvedFile)}
            onRename={() =>
              dispatch({
                type: "openRenameDialog",
                value: resolvedFile.filename,
              })
            }
          />
        }
      />
      <FilePreviewPanel file={previewFile} onClose={closePreview} />
      <FileDialogs
        deleteDialogOpen={state.deleteDialogOpen}
        filename={resolvedFile.filename}
        onCloseDelete={() => dispatch({ type: "closeDeleteDialog" })}
        onCloseRename={() => dispatch({ type: "closeRenameDialog" })}
        onConfirmDelete={handleDelete}
        onConfirmRename={handleRename}
        onRenameValueChange={(value) =>
          dispatch({ type: "setRenameValue", value })
        }
        renameDialogOpen={state.renameDialogOpen}
        renameValue={state.renameValue}
      />
    </>
  );
}
