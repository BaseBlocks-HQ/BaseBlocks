"use client";

import {
  DashboardConfirmDialog,
  DashboardDialogShell,
  dashboardDialogPrimaryFieldLabelClassName,
  dashboardDialogPrimaryInlineInputClassName,
} from "@/components/dialogs";
import { useFileUpload } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { useMediaViewer } from "@/modules/media-viewer";
import { useEditorSite } from "@/modules/shared/contexts/editor-context";
import { DropZone, FileIcon, getFileTypeColor } from "@/modules/shared/file-ui";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { DialogFooter } from "@baseblocks/ui/dialog";
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
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useReducer } from "react";
import { toast } from "sonner";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

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
  onDelete,
  onPreview,
  onRename,
}: {
  onDelete: () => void;
  onPreview: () => void;
  onRename: () => void;
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
        <DropdownMenuItem onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          {t("preview")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" />
          {t("rename")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("delete")}
        </DropdownMenuItem>
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
      <DashboardDialogShell
        open={renameDialogOpen}
        onOpenChange={(next) => {
          if (!next) onCloseRename();
        }}
        title={t("renameTitle")}
        contentClassName="sm:max-w-md"
      >
        <div>
          <Label
            htmlFor="file-rename-filename"
            className={dashboardDialogPrimaryFieldLabelClassName}
          >
            {t("renameFieldLabel")}
          </Label>
          <Input
            id="file-rename-filename"
            value={renameValue}
            onChange={(event) => onRenameValueChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onConfirmRename()}
            className={dashboardDialogPrimaryInlineInputClassName}
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
      </DashboardDialogShell>

      <DashboardConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={(next) => {
          if (!next) onCloseDelete();
        }}
        title={t("deleteTitle")}
        description={t("deleteDescription", { filename })}
        confirmLabel={t("delete")}
        cancelLabel={tCommon("cancel")}
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
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
function FileEditor({
  content,
  onSaveStatusChange,
  onUpdate,
}: ElementEditorProps<"file">) {
  const t = useTranslations("elements.file");
  const { siteId } = useEditorSite();
  const { openFile } = useMediaViewer();
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

  const previewFile = (file: FileData) => {
    openFile({
      url: file.downloadUrl,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    });
  };

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
        onOpen={() => previewFile(resolvedFile)}
        actions={
          <FileItemMenu
            onDelete={() => dispatch({ type: "openDeleteDialog" })}
            onPreview={() => previewFile(resolvedFile)}
            onRename={() =>
              dispatch({
                type: "openRenameDialog",
                value: resolvedFile.filename,
              })
            }
          />
        }
      />
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

function FileRenderer({ content }: ElementRendererProps<"file">) {
  const { openFile } = useMediaViewer();
  const file = getContentSnapshot(content);

  if (!file) {
    return null;
  }

  return (
    <SingleFileRow
      file={file}
      onOpen={() =>
        openFile({
          url: file.downloadUrl,
          filename: file.filename,
          contentType: file.contentType,
          size: file.size,
        })
      }
    />
  );
}

const FilePreview = themedPickerImagePreview(
  "/editor/picker/blocks/file-light.png",
  "/editor/picker/blocks/file-dark.png",
);

registerElement({
  type: "file",
  category: "blocks",
  label: "File",
  description: "Upload and preview a single file",
  icon: FileUp,
  keywords: ["file", "media", "document", "pdf", "upload"],
  editor: FileEditor,
  renderer: FileRenderer,
  preview: FilePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.file,
});
