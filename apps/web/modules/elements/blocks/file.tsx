"use client";

import { useFileUpload } from "@/lib/storage";
import { DocumentFileRow, DropZone } from "@/modules/documents";
import type { DocumentFileRowData } from "@/modules/documents";
import { useMediaViewer } from "@/modules/media-viewer";
import { useEditorSite } from "@/modules/shared/contexts/editor-context";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
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
import { useMutation, useQuery } from "convex/react";
import {
  Eye,
  FileUp,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useReducer } from "react";
import { toast } from "sonner";
import type {
  ElementEditorProps,
  ElementPreviewProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";

interface MediaFileData extends DocumentFileRowData {
  _id: string;
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
): MediaFileData | null {
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

function getFileContent(file: MediaFileData) {
  return {
    documentId: file._id,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    createdAt: file.createdAt,
  };
}

function MediaUploadState({
  isUploading,
  onFilesAccepted,
  uploadProgress,
}: {
  isUploading: boolean;
  onFilesAccepted: (files: File[]) => void;
  uploadProgress: number;
}) {
  return (
    <DropZone
      onFilesAccepted={onFilesAccepted}
      disabled={isUploading}
      className="rounded-lg border border-solid bg-card p-2 transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {isUploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FileUp className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {isUploading
                ? `Uploading media... ${uploadProgress}%`
                : "Upload media"}
            </p>
          </div>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
          {isUploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 h-4 w-4" />
          )}
          Upload
        </span>
      </div>
    </DropZone>
  );
}

function MediaItemMenu({
  onDelete,
  onPreview,
  onRename,
}: {
  onDelete: () => void;
  onPreview: () => void;
  onRename: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
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
  return (
    <>
      <Dialog
        open={renameDialogOpen}
        onOpenChange={(open) => !open && onCloseRename()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename file</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => onRenameValueChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onConfirmRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={onCloseRename}>
              Cancel
            </Button>
            <Button onClick={onConfirmRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => !open && onCloseDelete()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete file?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{filename}"?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={onCloseDelete}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
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
          } satisfies MediaFileData)
        : null;
  const isUploading = isAnyUploading;
  const uploadProgress = totalProgress?.percentage ?? 0;

  const previewFile = (file: MediaFileData) => {
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

    onSaveStatusChange?.("saving");
    const documentId = await uploadFile(file, {
      siteId: siteId as Id<"sites">,
      onError: (error) => toast.error(error.message),
    });

    if (!documentId) {
      onSaveStatusChange?.("idle");
      return;
    }

    const nextFile: MediaFileData = {
      _id: documentId,
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      createdAt: Date.now(),
      downloadUrl: getDocumentUrl(documentId),
    };

    await onUpdate(getFileContent(nextFile));
    toast.success("Uploaded");
    onSaveStatusChange?.("saved");
  };

  const handleRename = async () => {
    if (!resolvedFile) return;

    const nextName = state.renameValue.trim();
    if (!nextName) return;

    try {
      onSaveStatusChange?.("saving");
      await renameDocument({
        documentId: resolvedFile._id as Id<"documents">,
        filename: nextName,
      });
      await onUpdate(getFileContent({ ...resolvedFile, filename: nextName }));
      dispatch({ type: "closeRenameDialog" });
      toast.success("Renamed");
      onSaveStatusChange?.("saved");
    } catch {
      toast.error("Failed to rename");
      onSaveStatusChange?.("idle");
    }
  };

  const handleDelete = async () => {
    if (!resolvedFile) return;

    try {
      onSaveStatusChange?.("saving");
      await removeDocument({ documentId: resolvedFile._id as Id<"documents"> });
      await onUpdate({});
      dispatch({ type: "closeDeleteDialog" });
      toast.success("Deleted");
      onSaveStatusChange?.("saved");
    } catch {
      toast.error("Failed to delete");
      onSaveStatusChange?.("idle");
    }
  };

  if (!resolvedFile) {
    return (
      <MediaUploadState
        isUploading={isUploading}
        onFilesAccepted={handleFilesAccepted}
        uploadProgress={uploadProgress}
      />
    );
  }

  return (
    <>
      <DocumentFileRow
        file={resolvedFile}
        onOpen={previewFile}
        variant="block"
        actions={
          <MediaItemMenu
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
    <DocumentFileRow
      file={file}
      variant="block"
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

function FilePreview({ className }: ElementPreviewProps) {
  return (
    <div className={className}>
      <div className="flex h-full w-full items-center justify-center bg-muted/30 p-3">
        <div className="flex w-full items-center gap-2 rounded-lg border bg-background/85 p-2 shadow-sm">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileUp className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="h-2.5 w-3/4 rounded bg-foreground/70" />
            <div className="h-2 w-1/2 rounded bg-muted-foreground/35" />
          </div>
        </div>
      </div>
    </div>
  );
}

registerElement({
  type: "file",
  category: "blocks",
  label: "Media",
  description: "Upload and preview a single file",
  icon: FileUp,
  keywords: ["file", "media", "document", "pdf", "upload"],
  editor: FileEditor,
  renderer: FileRenderer,
  preview: FilePreview,
  defaultContent: DEFAULT_BLOCK_CONTENT.file,
});
