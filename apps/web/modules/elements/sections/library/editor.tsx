"use client";

import { useFileUpload } from "@/lib/storage";
import {
  DropZone,
  type FileData,
  useDocumentLibrary,
  useFileOperations,
  useFolderOperations,
  useFolderPath,
} from "@/modules/documents";
import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useMediaViewer } from "@/modules/media-viewer";
import { useEditorSite } from "@/modules/shared/contexts/editor-context";
import type { Id } from "@baseblocks/backend";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import {
  Eye,
  FolderPlus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";
import { useReducer, useRef } from "react";
import { toast } from "sonner";
import { LibraryBrowser } from "./components/library-browser";
import { LibraryContentList } from "./components/library-content-list";
import { useContainerWidth } from "./hooks/use-container-width";

interface LibraryDialogState {
  id: string;
  name: string;
  type: "file" | "folder";
}

interface LibraryEditorState {
  deleteDialog: LibraryDialogState | null;
  expandedFolders: Set<string>;
  newFolderDialog: boolean;
  newFolderName: string;
  newLibraryName: string;
  renameDialog: LibraryDialogState | null;
  selectedFolderId: string | null;
}

type LibraryEditorAction =
  | { type: "closeDeleteDialog" }
  | { type: "closeFolderDialog" }
  | { type: "closeRenameDialog" }
  | { type: "openDeleteDialog"; value: LibraryDialogState }
  | { type: "openFolderDialog" }
  | { type: "openRenameDialog"; value: LibraryDialogState }
  | { type: "selectFolder"; value: string | null }
  | { type: "setDeleteDialog"; value: LibraryDialogState | null }
  | { type: "setNewFolderName"; value: string }
  | { type: "setNewLibraryName"; value: string }
  | { type: "setRenameDialog"; value: LibraryDialogState | null }
  | { type: "toggleFolder"; value: string };

function createLibraryEditorState(): LibraryEditorState {
  return {
    deleteDialog: null,
    expandedFolders: new Set<string>(),
    newFolderDialog: false,
    newFolderName: "",
    newLibraryName: "",
    renameDialog: null,
    selectedFolderId: null,
  };
}

function libraryEditorReducer(
  state: LibraryEditorState,
  action: LibraryEditorAction,
): LibraryEditorState {
  switch (action.type) {
    case "closeDeleteDialog":
      return { ...state, deleteDialog: null };
    case "closeFolderDialog":
      return { ...state, newFolderDialog: false, newFolderName: "" };
    case "closeRenameDialog":
      return { ...state, renameDialog: null };
    case "openDeleteDialog":
      return { ...state, deleteDialog: action.value };
    case "openFolderDialog":
      return { ...state, newFolderDialog: true };
    case "openRenameDialog":
      return { ...state, renameDialog: action.value };
    case "selectFolder": {
      const expandedFolders = new Set(state.expandedFolders);
      if (action.value) {
        expandedFolders.add(action.value);
      }
      return {
        ...state,
        expandedFolders,
        selectedFolderId: action.value,
      };
    }
    case "setDeleteDialog":
      return { ...state, deleteDialog: action.value };
    case "setNewFolderName":
      return { ...state, newFolderName: action.value };
    case "setNewLibraryName":
      return { ...state, newLibraryName: action.value };
    case "setRenameDialog":
      return { ...state, renameDialog: action.value };
    case "toggleFolder": {
      const expandedFolders = new Set(state.expandedFolders);
      if (expandedFolders.has(action.value)) {
        expandedFolders.delete(action.value);
      } else {
        expandedFolders.add(action.value);
      }
      return { ...state, expandedFolders };
    }
    default:
      return state;
  }
}

function LibraryPicker({
  libraries,
  newLibraryName,
  onCreateLibrary,
  onLibrarySelect,
  onNameChange,
}: {
  libraries: { _id: string; name: string }[] | undefined;
  newLibraryName: string;
  onCreateLibrary: () => void;
  onLibrarySelect: (value: string) => void;
  onNameChange: (value: string) => void;
}) {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm text-muted-foreground text-center">
        Select or create a document library
      </p>
      {libraries && libraries.length > 0 && (
        <Select onValueChange={onLibrarySelect}>
          <SelectTrigger className="text-sm">
            <SelectValue placeholder="Select library..." />
          </SelectTrigger>
          <SelectContent>
            {libraries.map((library) => (
              <SelectItem key={library._id} value={library._id}>
                {library.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex gap-2">
        <Input
          placeholder="New library name"
          value={newLibraryName}
          onChange={(event) => onNameChange(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && onCreateLibrary()}
          className="text-sm"
        />
        <Button
          size="sm"
          onClick={onCreateLibrary}
          disabled={!newLibraryName.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function LibraryDialogs({
  deleteDialog,
  newFolderDialog,
  newFolderName,
  onCloseDelete,
  onCloseNewFolder,
  onCloseRename,
  onConfirmDelete,
  onConfirmRename,
  onCreateFolder,
  onNewFolderDialogChange,
  onNewFolderNameChange,
  onRenameDialogChange,
  renameDialog,
}: {
  deleteDialog: LibraryDialogState | null;
  newFolderDialog: boolean;
  newFolderName: string;
  onCloseDelete: () => void;
  onCloseNewFolder: () => void;
  onCloseRename: () => void;
  onConfirmDelete: () => void;
  onConfirmRename: () => void;
  onCreateFolder: () => void;
  onNewFolderDialogChange: (open: boolean) => void;
  onNewFolderNameChange: (value: string) => void;
  onRenameDialogChange: (value: string) => void;
  renameDialog: LibraryDialogState | null;
}) {
  return (
    <>
      <Dialog
        open={Boolean(renameDialog)}
        onOpenChange={(open) => !open && onCloseRename()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameDialog?.type}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDialog?.name || ""}
            onChange={(event) => onRenameDialogChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onConfirmRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={onCloseRename}>
              Cancel
            </Button>
            <Button onClick={onConfirmRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteDialog)}
        onOpenChange={(open) => !open && onCloseDelete()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog?.type}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deleteDialog?.name}"?
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

      <Dialog open={newFolderDialog} onOpenChange={onNewFolderDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(event) => onNewFolderNameChange(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && onCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={onCloseNewFolder}>
              Cancel
            </Button>
            <Button onClick={onCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function useLibraryEditorController({
  content,
  onUpdate,
}: Pick<ElementEditorProps<"library">, "content" | "onUpdate">) {
  const { siteId } = useEditorSite();
  const { openFile } = useMediaViewer();
  const [containerRef, containerWidth] = useContainerWidth();

  const showFolderTree = content.showFolderTree !== false;
  const showSidebar = containerWidth >= 560 && showFolderTree;
  const [state, dispatch] = useReducer(
    libraryEditorReducer,
    undefined,
    createLibraryEditorState,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { libraries, create: createLibrary } = useDocumentLibrary(
    siteId as Id<"sites">,
  );

  const libraryId = content.libraryId
    ? (content.libraryId as Id<"documentLibraries">)
    : null;
  const {
    folders,
    create: createFolder,
    rename: renameFolder,
    remove: removeFolder,
  } = useFolderOperations(libraryId);

  const folderId = state.selectedFolderId
    ? (state.selectedFolderId as Id<"documentFolders">)
    : null;
  const {
    files,
    rename: renameFile,
    remove: removeFile,
  } = useFileOperations(libraryId, folderId);

  const folderPath = useFolderPath(folderId);
  const { uploadFiles, uploadStates } = useFileUpload();

  const isUploading = Object.values(uploadStates).some((s) => s.isUploading);
  const currentLibrary = libraries?.find((l) => l._id === content.libraryId);

  const toggleFolder = (id: string) => {
    dispatch({ type: "toggleFolder", value: id });
  };

  const selectFolder = (id: string | null) => {
    dispatch({ type: "selectFolder", value: id });
  };

  const handleFilesAccepted = async (acceptedFiles: File[]) => {
    if (!libraryId) return;
    await uploadFiles(acceptedFiles, {
      siteId: siteId as Id<"sites">,
      libraryId,
      folderId: folderId ?? undefined,
      onSuccess: () => toast.success("Uploaded"),
      onError: (e) => toast.error(e.message),
    });
  };

  const handlePreview = (file: FileData) => {
    openFile({
      url: file.downloadUrl,
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      allowDownload: content.allowDownloads !== false,
    });
  };

  const handleRename = async () => {
    if (!state.renameDialog) return;
    try {
      if (state.renameDialog.type === "folder") {
        await renameFolder(
          state.renameDialog.id as Id<"documentFolders">,
          state.renameDialog.name,
        );
      } else {
        await renameFile(
          state.renameDialog.id as Id<"documents">,
          state.renameDialog.name,
        );
      }
      toast.success("Renamed");
      dispatch({ type: "closeRenameDialog" });
    } catch {
      toast.error("Failed to rename");
    }
  };

  const handleDelete = async () => {
    if (!state.deleteDialog) return;
    try {
      if (state.deleteDialog.type === "folder") {
        await removeFolder(state.deleteDialog.id as Id<"documentFolders">);
        if (state.selectedFolderId === state.deleteDialog.id) {
          dispatch({ type: "selectFolder", value: null });
        }
      } else {
        await removeFile(state.deleteDialog.id as Id<"documents">);
      }
      toast.success("Deleted");
      dispatch({ type: "closeDeleteDialog" });
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCreateFolder = async () => {
    const folderName = state.newFolderName.trim();
    const parentFolderId = folderId ?? undefined;
    if (!folderName) return;
    try {
      await createFolder(folderName, parentFolderId);
      toast.success("Folder created");
      dispatch({ type: "closeFolderDialog" });
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleCreateLibrary = async () => {
    if (!state.newLibraryName.trim()) return;
    try {
      const id = await createLibrary(state.newLibraryName.trim());
      await onUpdate({ ...content, libraryId: id });
      dispatch({ type: "setNewLibraryName", value: "" });
      toast.success("Library created");
    } catch {
      toast.error("Failed to create library");
    }
  };

  if (!content.libraryId) {
    return {
      containerRef,
      dialogs: null,
      handleFilesAccepted: (_files: File[]) => {},
      isUploading,
      libraryId,
      picker: (
        <LibraryPicker
          libraries={libraries}
          newLibraryName={state.newLibraryName}
          onCreateLibrary={handleCreateLibrary}
          onLibrarySelect={(value) =>
            onUpdate({ ...content, libraryId: value })
          }
          onNameChange={(value) =>
            dispatch({ type: "setNewLibraryName", value })
          }
        />
      ),
      sidebar: null,
    };
  }

  const sortedFiles = [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );
  const currentSubfolders = folders
    .filter(
      (folder) => folder.parentId === (state.selectedFolderId ?? undefined),
    )
    .sort((a, b) => a.order - b.order);

  const lastFolder =
    folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const currentLocation =
    lastFolder?.name ?? (currentLibrary?.name || "Library");

  const uploadTrigger = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          const acceptedFiles = Array.from(event.target.files || []);
          if (acceptedFiles.length > 0) {
            handleFilesAccepted(acceptedFiles);
          }
          event.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
    </>
  );

  const contentList = (
    <LibraryContentList
      subfolders={currentSubfolders}
      files={sortedFiles}
      onSelectFolder={selectFolder}
      onOpenFile={handlePreview}
      renderFolderActions={(folder) => (
        <LibraryItemMenu
          items={[
            {
              label: "Rename",
              icon: <Pencil className="mr-2 h-4 w-4" />,
              onSelect: () =>
                dispatch({
                  type: "openRenameDialog",
                  value: { type: "folder", id: folder._id, name: folder.name },
                }),
            },
            {
              label: "Delete",
              icon: <Trash2 className="mr-2 h-4 w-4" />,
              onSelect: () =>
                dispatch({
                  type: "openDeleteDialog",
                  value: { type: "folder", id: folder._id, name: folder.name },
                }),
              destructive: true,
            },
          ]}
        />
      )}
      renderFileActions={(file) => (
        <LibraryItemMenu
          items={[
            {
              label: "Preview",
              icon: <Eye className="mr-2 h-4 w-4" />,
              onSelect: () => handlePreview(file),
            },
            {
              label: "Rename",
              icon: <Pencil className="mr-2 h-4 w-4" />,
              onSelect: () =>
                dispatch({
                  type: "openRenameDialog",
                  value: { type: "file", id: file._id, name: file.filename },
                }),
            },
            {
              label: "Delete",
              icon: <Trash2 className="mr-2 h-4 w-4" />,
              onSelect: () =>
                dispatch({
                  type: "openDeleteDialog",
                  value: { type: "file", id: file._id, name: file.filename },
                }),
              destructive: true,
            },
          ]}
        />
      )}
      emptyState={
        <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm font-medium">No files yet</p>
          <p className="mt-0.5 text-xs opacity-70">
            Drop files here or upload one
          </p>
        </div>
      }
    />
  );

  const dialogs = (
    <LibraryDialogs
      deleteDialog={state.deleteDialog}
      newFolderDialog={state.newFolderDialog}
      newFolderName={state.newFolderName}
      onCloseDelete={() => dispatch({ type: "closeDeleteDialog" })}
      onCloseNewFolder={() => dispatch({ type: "closeFolderDialog" })}
      onCloseRename={() => dispatch({ type: "closeRenameDialog" })}
      onConfirmDelete={handleDelete}
      onConfirmRename={handleRename}
      onCreateFolder={handleCreateFolder}
      onNewFolderDialogChange={(open) =>
        dispatch(
          open ? { type: "openFolderDialog" } : { type: "closeFolderDialog" },
        )
      }
      onNewFolderNameChange={(value) =>
        dispatch({ type: "setNewFolderName", value })
      }
      onRenameDialogChange={(value) =>
        dispatch({
          type: "setRenameDialog",
          value: state.renameDialog
            ? { ...state.renameDialog, name: value }
            : null,
        })
      }
      renameDialog={state.renameDialog}
    />
  );

  return {
    containerRef,
    dialogs,
    handleFilesAccepted,
    isUploading,
    libraryId,
    picker: null,
    sidebar: (
      <LibraryBrowser
        containerRef={containerRef}
        libraryName={currentLibrary?.name || "Library"}
        currentLocation={currentLocation}
        folderPath={folderPath}
        folders={folders}
        expandedFolders={state.expandedFolders}
        selectedFolderId={state.selectedFolderId}
        showFolderTree={showFolderTree}
        showSidebar={showSidebar}
        onSelectFolder={selectFolder}
        onToggleFolder={toggleFolder}
        renderTreeActions={(folder) => (
          <LibraryItemMenu
            items={[
              {
                label: "Rename",
                icon: <Pencil className="mr-2 h-4 w-4" />,
                onSelect: () =>
                  dispatch({
                    type: "openRenameDialog",
                    value: {
                      type: "folder",
                      id: folder._id,
                      name: folder.name,
                    },
                  }),
              },
              {
                label: "Delete",
                icon: <Trash2 className="mr-2 h-4 w-4" />,
                onSelect: () =>
                  dispatch({
                    type: "openDeleteDialog",
                    value: {
                      type: "folder",
                      id: folder._id,
                      name: folder.name,
                    },
                  }),
                destructive: true,
              },
            ]}
          />
        )}
        sidebarFooter={
          <div className="flex items-center gap-1">
            {uploadTrigger}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 justify-start text-muted-foreground hover:text-foreground"
              onClick={() => dispatch({ type: "openFolderDialog" })}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New folder
            </Button>
          </div>
        }
        mobileMenuFooter={
          <div className="flex items-center gap-1">
            {uploadTrigger}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 justify-start text-muted-foreground hover:text-foreground"
              onClick={() => dispatch({ type: "openFolderDialog" })}
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              New folder
            </Button>
          </div>
        }
      >
        {contentList}
      </LibraryBrowser>
    ),
  };
}

export function LibraryEditor({
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  const {
    containerRef,
    dialogs,
    handleFilesAccepted,
    isUploading,
    libraryId,
    picker,
    sidebar,
  } = useLibraryEditorController({
    content,
    onUpdate,
  });

  if (!content.libraryId) {
    return <div ref={containerRef}>{picker}</div>;
  }

  return (
    <>
      <DropZone
        onFilesAccepted={handleFilesAccepted}
        disabled={isUploading || !libraryId}
        className="border-0 rounded-none"
        noClick
      >
        {sidebar}
      </DropZone>

      {dialogs}
    </>
  );
}

interface LibraryItemMenuEntry {
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}

function LibraryItemMenu({ items }: { items: LibraryItemMenuEntry[] }) {
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
        {items.map((item, index) => (
          <div key={item.label}>
            {index > 0 && item.destructive ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              onClick={(event) => {
                event.stopPropagation();
                item.onSelect();
              }}
              className={
                item.destructive
                  ? "text-destructive focus:text-destructive"
                  : undefined
              }
            >
              {item.icon}
              {item.label}
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
