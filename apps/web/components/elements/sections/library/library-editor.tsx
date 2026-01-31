"use client";

import {
  type FileData,
  type FolderData,
  FileIcon,
  getFileTypeColor,
  useDocumentLibrary,
  useFileOperations,
  useFolderOperations,
  useFolderPath,
} from "@/components/document-library";
import { useEditorContext } from "@/components/editor";
import type { ElementEditorProps } from "@/components/elements/registry";
import { useMediaViewer } from "@/components/media-viewer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { MiddleTruncate } from "@/components/ui/middle-truncate";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFileUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import type { Id } from "@repo/backend";
import {
  ChevronRight,
  Eye,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  Home,
  Loader2,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

function useContainerWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(ref.current);
    setWidth(ref.current.offsetWidth);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function FolderItem({
  folder,
  level,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
  onRename,
  onDelete,
  children,
}: {
  folder: FolderData;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRename: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 px-2 py-1 text-sm rounded cursor-pointer",
          isSelected ? "bg-accent" : "hover:bg-muted/50",
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={onSelect}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className={cn("p-0.5 shrink-0", !hasChildren && "invisible")}
        >
          <ChevronRight
            className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")}
          />
        </button>
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="truncate flex-1 min-w-0">{folder.name}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="p-1 opacity-0 group-hover:opacity-100 shrink-0"
            >
              <MoreHorizontal className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="h-3 w-3 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-3 w-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isExpanded && children}
    </div>
  );
}

function FileItem({
  file,
  onPreview,
  onRename,
  onDelete,
}: {
  file: FileData;
  onPreview: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer"
      onClick={onPreview}
    >
      <div className={cn("shrink-0", getFileTypeColor(file.contentType))}>
        <FileIcon contentType={file.contentType} className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <MiddleTruncate text={file.filename} className="text-sm" endChars={8} />
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="p-1 opacity-0 group-hover:opacity-100 shrink-0"
          >
            <MoreHorizontal className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onPreview}>
            <Eye className="h-3 w-3 mr-2" /> Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-3 w-3 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-3 w-3 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function LibraryEditor({
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  const { siteId } = useEditorContext();
  const { openFile } = useMediaViewer();
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);

  const showSidebar = containerWidth >= 400;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newLibraryName, setNewLibraryName] = useState("");
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [breadcrumbOpen, setBreadcrumbOpen] = useState(false);
  const [renameDialog, setRenameDialog] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ type: "file" | "folder"; id: string; name: string } | null>(null);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { libraries, create: createLibrary } = useDocumentLibrary(siteId);

  const libraryId = content.libraryId ? (content.libraryId as Id<"documentLibraries">) : null;
  const { folders, create: createFolder, rename: renameFolder, remove: removeFolder } = useFolderOperations(libraryId);

  const folderId = selectedFolderId ? (selectedFolderId as Id<"documentFolders">) : null;
  const { files, rename: renameFile, remove: removeFile } = useFileOperations(libraryId, folderId);

  const folderPath = useFolderPath(folderId);
  const { uploadFiles, uploadStates } = useFileUpload();

  const isUploading = Object.values(uploadStates).some((s) => s.isUploading);
  const currentLibrary = libraries?.find((l) => l._id === content.libraryId);

  const folderTree = useMemo(() => {
    const map = new Map<string | undefined, FolderData[]>();
    for (const f of folders) {
      const key = f.parentId || undefined;
      const arr = map.get(key) || [];
      arr.push(f);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.order - b.order);
    return map;
  }, [folders]);

  const hasChildren = (id: string) => (folderTree.get(id)?.length || 0) > 0;

  const toggleFolder = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectFolder = (id: string | null, closeMenu = false) => {
    setSelectedFolderId(id);
    if (id) setExpandedFolders((prev) => new Set(prev).add(id));
    if (closeMenu) setFolderMenuOpen(false);
    setBreadcrumbOpen(false);
  };

  const handleFilesAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      if (!libraryId) return;
      await uploadFiles(acceptedFiles, {
        siteId,
        libraryId,
        folderId: folderId ?? undefined,
        onSuccess: () => toast.success("Uploaded"),
        onError: (e) => toast.error(e.message),
      });
    },
    [siteId, libraryId, folderId, uploadFiles],
  );

  const handlePreview = (file: FileData) => {
    openFile({
      url: toProxyDownloadUrl(file.cdnUrl),
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
    });
  };

  const handleRename = async () => {
    if (!renameDialog) return;
    try {
      if (renameDialog.type === "folder") {
        await renameFolder(renameDialog.id as Id<"documentFolders">, renameDialog.name);
      } else {
        await renameFile(renameDialog.id as Id<"documents">, renameDialog.name);
      }
      toast.success("Renamed");
      setRenameDialog(null);
    } catch {
      toast.error("Failed to rename");
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    try {
      if (deleteDialog.type === "folder") {
        await removeFolder(deleteDialog.id as Id<"documentFolders">);
        if (selectedFolderId === deleteDialog.id) setSelectedFolderId(null);
      } else {
        await removeFile(deleteDialog.id as Id<"documents">);
      }
      toast.success("Deleted");
      setDeleteDialog(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolder(newFolderName.trim(), folderId ?? undefined);
      toast.success("Folder created");
      setNewFolderName("");
      setNewFolderDialog(false);
    } catch {
      toast.error("Failed to create folder");
    }
  };

  const handleCreateLibrary = async () => {
    if (!newLibraryName.trim()) return;
    try {
      const id = await createLibrary(newLibraryName.trim());
      await onUpdate({ ...content, libraryId: id });
      setNewLibraryName("");
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
        isSelected={selectedFolderId === f._id}
        isExpanded={expandedFolders.has(f._id)}
        hasChildren={hasChildren(f._id)}
        onSelect={() => selectFolder(f._id, !showSidebar)}
        onToggle={() => toggleFolder(f._id)}
        onRename={() => setRenameDialog({ type: "folder", id: f._id, name: f.name })}
        onDelete={() => setDeleteDialog({ type: "folder", id: f._id, name: f.name })}
      >
        {expandedFolders.has(f._id) && renderFolders(f._id, level + 1)}
      </FolderItem>
    ));
  };

  // No library - show picker
  if (!content.libraryId) {
    return (
      <div ref={containerRef} className="border rounded-lg p-4 space-y-3">
        <p className="text-sm text-muted-foreground text-center">Select or create a document library</p>
        {libraries && libraries.length > 0 && (
          <Select onValueChange={(v) => onUpdate({ ...content, libraryId: v })}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Select library..." />
            </SelectTrigger>
            <SelectContent>
              {libraries.map((lib) => (
                <SelectItem key={lib._id} value={lib._id}>{lib.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="New library name"
            value={newLibraryName}
            onChange={(e) => setNewLibraryName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateLibrary()}
            className="text-sm"
          />
          <Button size="sm" onClick={handleCreateLibrary} disabled={!newLibraryName.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  const sortedFiles = [...files].sort((a, b) => a.filename.localeCompare(b.filename));

  // Current location display text
  const lastFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const currentLocation = lastFolder?.name ?? (currentLibrary?.name || "Library");

  // Breadcrumb navigation popover content
  const breadcrumbNavContent = (
    <div className="py-1">
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded",
          !selectedFolderId && "bg-accent"
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
            index === folderPath.length - 1 && "bg-accent"
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
      <Popover open={breadcrumbOpen} onOpenChange={setBreadcrumbOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-w-0 flex-1 overflow-hidden"
          >
            <Home className="h-3 w-3 shrink-0" />
            {folderPath.length > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
            <span className="truncate">{currentLocation}</span>
            {folderPath.length > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-30" />}
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
        {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
      </Button>
    </div>
  );

  // Mobile folder menu content
  const folderMenuContent = (
    <div className="flex flex-col max-h-72 overflow-hidden">
      {/* Breadcrumb nav in popover */}
      <div className="border-b">
        {breadcrumbNavContent}
      </div>
      {/* Folder list */}
      <div className="flex-1 overflow-auto py-1">
        {folders.length > 0 ? (
          renderFolders()
        ) : (
          <p className="text-xs text-muted-foreground text-center py-3">No folders</p>
        )}
      </div>
      <div className="border-t p-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs h-7"
          onClick={() => {
            setFolderMenuOpen(false);
            setNewFolderDialog(true);
          }}
        >
          <FolderPlus className="h-3 w-3 mr-2" />
          New folder
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className="border rounded-lg overflow-hidden">
        <div className="flex h-48">
          {/* Sidebar - shown when container is wide enough */}
          {showSidebar && (
            <div className="flex flex-col w-40 border-r bg-muted/20 shrink-0 overflow-hidden">
              {sidebarHeader}
              <div className="flex-1 overflow-auto py-1">
                {folders.length > 0 ? (
                  renderFolders()
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">No folders</p>
                )}
              </div>
              <div className="border-t p-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-7"
                  onClick={() => setNewFolderDialog(true)}
                >
                  <FolderPlus className="h-3 w-3 mr-1.5" />
                  New folder
                </Button>
              </div>
            </div>
          )}

          {/* File list area */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Compact header for mobile - only menu button + breadcrumb + upload */}
            {!showSidebar && (
              <div className="flex items-center gap-1 px-1.5 py-1 border-b bg-muted/30 shrink-0">
                <Popover open={folderMenuOpen} onOpenChange={setFolderMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                      <Menu className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="start" className="w-56 p-0">
                    {folderMenuContent}
                  </PopoverContent>
                </Popover>

                <Popover open={breadcrumbOpen} onOpenChange={setBreadcrumbOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground min-w-0 flex-1 overflow-hidden"
                    >
                      <Home className="h-3 w-3 shrink-0" />
                      {folderPath.length > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
                      <span className="truncate">{currentLocation}</span>
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
                  className="h-6 w-6 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}

            {/* File list */}
            <div className="flex-1 min-w-0 overflow-auto p-1">
              {sortedFiles.length > 0 ? (
                sortedFiles.map((file) => (
                  <FileItem
                    key={file._id}
                    file={file}
                    onPreview={() => handlePreview(file)}
                    onRename={() => setRenameDialog({ type: "file", id: file._id, name: file.filename })}
                    onDelete={() => setDeleteDialog({ type: "file", id: file._id, name: file.filename })}
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
          </div>
        </div>
      </div>

      {/* Rename dialog */}
      <Dialog open={!!renameDialog} onOpenChange={(o) => !o && setRenameDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {renameDialog?.type}</DialogTitle>
          </DialogHeader>
          <Input
            value={renameDialog?.name || ""}
            onChange={(e) => setRenameDialog((p) => p && { ...p, name: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialog(null)}>Cancel</Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteDialog} onOpenChange={(o) => !o && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteDialog?.type}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{deleteDialog?.name}"?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New folder dialog */}
      <Dialog open={newFolderDialog} onOpenChange={setNewFolderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewFolderDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
