"use client";

import { useFileUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import {
  DropZone,
  type FileData,
  type FolderData,
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
import { Input } from "@baseblocks/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import {
  ChevronRight,
  File,
  Folder,
  FolderPlus,
  Home,
  Loader2,
  Menu,
  Plus,
  Upload,
} from "lucide-react";
import { useReducer, useRef } from "react";
import { toast } from "sonner";
import { FileItem } from "./components/file-item";
import { FolderItem } from "./components/folder-item";
import { useContainerWidth } from "./hooks/use-container-width";

interface LibraryDialogState {
  id: string;
  name: string;
  type: "file" | "folder";
}

interface LibraryEditorState {
  breadcrumbOpen: boolean;
  deleteDialog: LibraryDialogState | null;
  expandedFolders: Set<string>;
  folderMenuOpen: boolean;
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
  | { type: "selectFolder"; value: string | null; closeMenu?: boolean }
  | { type: "setBreadcrumbOpen"; value: boolean }
  | { type: "setDeleteDialog"; value: LibraryDialogState | null }
  | { type: "setFolderMenuOpen"; value: boolean }
  | { type: "setNewFolderName"; value: string }
  | { type: "setNewLibraryName"; value: string }
  | { type: "setRenameDialog"; value: LibraryDialogState | null }
  | { type: "toggleFolder"; value: string };

function createLibraryEditorState(): LibraryEditorState {
  return {
    breadcrumbOpen: false,
    deleteDialog: null,
    expandedFolders: new Set<string>(),
    folderMenuOpen: false,
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
      return { ...state, folderMenuOpen: false, newFolderDialog: true };
    case "openRenameDialog":
      return { ...state, renameDialog: action.value };
    case "selectFolder": {
      const expandedFolders = new Set(state.expandedFolders);
      if (action.value) {
        expandedFolders.add(action.value);
      }
      return {
        ...state,
        breadcrumbOpen: false,
        expandedFolders,
        folderMenuOpen: action.closeMenu ? false : state.folderMenuOpen,
        selectedFolderId: action.value,
      };
    }
    case "setBreadcrumbOpen":
      return { ...state, breadcrumbOpen: action.value };
    case "setDeleteDialog":
      return { ...state, deleteDialog: action.value };
    case "setFolderMenuOpen":
      return { ...state, folderMenuOpen: action.value };
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

function FolderMenuContent({
  breadcrumbNavContent,
  children,
  onNewFolder,
}: {
  breadcrumbNavContent: React.ReactNode;
  children: React.ReactNode;
  onNewFolder: () => void;
}) {
  return (
    <div className="flex flex-col max-h-72 overflow-hidden">
      <div className="border-b">{breadcrumbNavContent}</div>
      <div className="flex-1 overflow-auto py-1">{children}</div>
      <div className="border-t p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-7"
          onClick={onNewFolder}
        >
          <FolderPlus className="h-3 w-3 mr-2" />
          New folder
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
  const showSidebar = containerWidth >= 400 && showFolderTree;
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

  const folderTree = (() => {
    const map = new Map<string | undefined, FolderData[]>();
    for (const f of folders) {
      const key = f.parentId || undefined;
      const arr = map.get(key) || [];
      arr.push(f);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  })();

  const hasChildren = (id: string) => (folderTree.get(id)?.length || 0) > 0;

  const toggleFolder = (id: string) => {
    dispatch({ type: "toggleFolder", value: id });
  };

  const selectFolder = (id: string | null, closeMenu = false) => {
    dispatch({ type: "selectFolder", value: id, closeMenu });
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
      url: toProxyDownloadUrl(file.cdnUrl),
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

  const renderFolders = (parentId?: string, level = 0): React.ReactNode => {
    const children = folderTree.get(parentId) || [];
    return children.map((f) => (
      <FolderItem
        key={f._id}
        folder={f}
        level={level}
        isSelected={state.selectedFolderId === f._id}
        isExpanded={state.expandedFolders.has(f._id)}
        hasChildren={hasChildren(f._id)}
        onSelect={() => selectFolder(f._id, !showSidebar)}
        onToggle={() => toggleFolder(f._id)}
        onRename={() =>
          dispatch({
            type: "openRenameDialog",
            value: { type: "folder", id: f._id, name: f.name },
          })
        }
        onDelete={() =>
          dispatch({
            type: "openDeleteDialog",
            value: { type: "folder", id: f._id, name: f.name },
          })
        }
      >
        {state.expandedFolders.has(f._id) && renderFolders(f._id, level + 1)}
      </FolderItem>
    ));
  };

  if (!content.libraryId) {
    return {
      containerRef,
      dialogs: null,
      fileList: null,
      handleFilesAccepted: (_files: File[]) => {},
      isUploading,
      libraryId,
      mobileHeader: null,
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
      showSidebar,
      sidebar: null,
    };
  }

  const sortedFiles = [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );

  // Current location display text
  const lastFolder =
    folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const currentLocation =
    lastFolder?.name ?? (currentLibrary?.name || "Library");

  // Breadcrumb navigation popover content
  const breadcrumbNavContent = (
    <div className="py-1">
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded",
          !state.selectedFolderId && "bg-accent",
        )}
        onClick={() => selectFolder(null)}
      >
        <Home className="h-3.5 w-3.5" />
        <span className="truncate">{currentLibrary?.name || "Library"}</span>
      </button>
      {folderPath.map((folder, index) => (
        <button
          key={folder._id}
          type="button"
          className={cn(
            "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded",
            index === folderPath.length - 1 && "bg-accent",
          )}
          style={{ paddingLeft: `${(index + 1) * 12 + 12}px` }}
          onClick={() => selectFolder(folder._id)}
        >
          <Folder className="h-3.5 w-3.5" />
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  );

  // Sidebar header with breadcrumb and upload
  const sidebarHeader = (
    <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
      <Popover
        open={state.breadcrumbOpen}
        onOpenChange={(value) => dispatch({ type: "setBreadcrumbOpen", value })}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-w-0 flex-1 overflow-hidden"
          >
            <Home className="h-3 w-3 shrink-0" />
            {folderPath.length > 0 && (
              <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
            )}
            <span className="truncate">{currentLocation}</span>
            {folderPath.length > 0 && (
              <ChevronRight className="h-3 w-3 shrink-0 opacity-30" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-48 p-0">
          {breadcrumbNavContent}
        </PopoverContent>
      </Popover>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const f = Array.from(e.target.files || []);
          if (f.length) handleFilesAccepted(f);
          e.target.value = "";
        }}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Upload className="h-3 w-3" />
        )}
      </Button>
    </div>
  );

  // Mobile folder menu content
  const folderMenuContent = (
    <FolderMenuContent
      breadcrumbNavContent={breadcrumbNavContent}
      onNewFolder={() => dispatch({ type: "openFolderDialog" })}
    >
      {folders.length > 0 ? (
        renderFolders()
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          No folders
        </p>
      )}
    </FolderMenuContent>
  );

  const sidebar = showSidebar ? (
    <div className="flex flex-col w-40 border-r bg-muted/20 shrink-0 overflow-hidden">
      {sidebarHeader}
      <div className="flex-1 overflow-auto py-1">
        {folders.length > 0 ? (
          renderFolders()
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            No folders
          </p>
        )}
      </div>
      <div className="border-t p-1.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-7"
          onClick={() => dispatch({ type: "openFolderDialog" })}
        >
          <FolderPlus className="h-3 w-3 mr-1.5" />
          New folder
        </Button>
      </div>
    </div>
  ) : null;

  const mobileHeader = !showSidebar ? (
    <div className="flex items-center gap-1 px-1.5 py-1 border-b bg-muted/30 shrink-0">
      {showFolderTree && (
        <>
          <Popover
            open={state.folderMenuOpen}
            onOpenChange={(value) =>
              dispatch({ type: "setFolderMenuOpen", value })
            }
          >
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-56 p-0">
              {folderMenuContent}
            </PopoverContent>
          </Popover>

          <Popover
            open={state.breadcrumbOpen}
            onOpenChange={(value) =>
              dispatch({ type: "setBreadcrumbOpen", value })
            }
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-w-0 flex-1 overflow-hidden"
              >
                <Home className="h-3 w-3 shrink-0" />
                {folderPath.length > 0 && (
                  <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
                )}
                <span className="truncate">{currentLocation}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="start" className="w-48 p-0">
              {breadcrumbNavContent}
            </PopoverContent>
          </Popover>
        </>
      )}

      {!showFolderTree && (
        <span className="text-xs text-muted-foreground flex-1">
          {currentLibrary?.name || "Library"}
        </span>
      )}

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
        className="h-6 w-6 shrink-0"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  ) : null;

  const fileList = (
    <div className="flex-1 min-w-0 overflow-auto p-1">
      {sortedFiles.length > 0 ? (
        sortedFiles.map((file) => (
          <FileItem
            key={file._id}
            file={file}
            onPreview={() => handlePreview(file)}
            onRename={() =>
              dispatch({
                type: "openRenameDialog",
                value: {
                  type: "file",
                  id: file._id,
                  name: file.filename,
                },
              })
            }
            onDelete={() =>
              dispatch({
                type: "openDeleteDialog",
                value: {
                  type: "file",
                  id: file._id,
                  name: file.filename,
                },
              })
            }
          />
        ))
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <File className="h-6 w-6 mb-1.5 opacity-50" />
          <p className="text-xs">No files</p>
          <p className="text-xs opacity-70">Drop files or click upload</p>
        </div>
      )}
    </div>
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
    fileList,
    handleFilesAccepted,
    isUploading,
    libraryId,
    mobileHeader,
    picker: null,
    showSidebar,
    sidebar,
  };
}

export function LibraryEditor({
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  const {
    containerRef,
    dialogs,
    fileList,
    handleFilesAccepted,
    isUploading,
    libraryId,
    mobileHeader,
    picker,
    showSidebar,
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
        <div ref={containerRef} className="border rounded-lg overflow-hidden">
          <div className="flex h-100">
            {sidebar}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
              {!showSidebar && mobileHeader}
              {fileList}
            </div>
          </div>
        </div>
      </DropZone>

      {dialogs}
    </>
  );
}
