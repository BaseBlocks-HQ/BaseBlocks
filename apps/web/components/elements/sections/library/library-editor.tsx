"use client";

import {
  Breadcrumbs,
  CreateFolderButton,
  DropZone,
  EmptyState,
  type FileData,
  FileList,
  type FolderData,
  FolderTree,
  useDocumentLibrary,
  useFileOperations,
  useFolderOperations,
  useFolderPath,
} from "@/components/document-library";
import { useEditorContext } from "@/components/editor";
import type { ElementEditorProps } from "@/components/elements/registry";
import { useMediaViewer } from "@/components/media-viewer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useFileUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import type { LibraryContent } from "@/types/elements";
import type { Id } from "@repo/backend";
import {
  FolderTree as FolderTreeIcon,
  Loader2,
  Plus,
  Settings2,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export function LibraryEditor({
  id,
  content,
  onUpdate,
}: ElementEditorProps<"library">) {
  const { siteId } = useEditorContext();
  const { openFile } = useMediaViewer();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingLibrary, setIsCreatingLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");
  const [isFolderSheetOpen, setIsFolderSheetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Library CRUD
  const { libraries, create: createLibrary } = useDocumentLibrary(siteId);

  // Folder operations
  const libraryId = content.libraryId
    ? (content.libraryId as Id<"documentLibraries">)
    : null;
  const {
    folders,
    create: createFolder,
    rename: renameFolder,
    remove: removeFolder,
  } = useFolderOperations(libraryId);

  // File operations
  const folderId = selectedFolderId
    ? (selectedFolderId as Id<"documentFolders">)
    : null;
  const {
    files,
    rename: renameFile,
    remove: removeFile,
  } = useFileOperations(libraryId, folderId);

  // Folder path for breadcrumbs
  const folderPath = useFolderPath(folderId);

  // File upload
  const { uploadFiles, uploadStates } = useFileUpload();

  const activeUploads = Object.entries(uploadStates).filter(
    ([, state]) => state.isUploading,
  );
  const uploadCount = activeUploads.length;
  const isUploading = uploadCount > 0;

  const handleSelectLibrary = useCallback(
    async (newLibraryId: string) => {
      await onUpdate({ ...content, libraryId: newLibraryId });
      setSelectedFolderId(null);
    },
    [content, onUpdate],
  );

  const handleCreateLibrary = useCallback(async () => {
    if (!newLibraryName.trim()) return;

    setIsCreatingLibrary(true);
    try {
      const newLibraryId = await createLibrary(newLibraryName.trim());
      await onUpdate({ ...content, libraryId: newLibraryId });
      setNewLibraryName("");
      toast.success("Library created");
    } catch (error) {
      console.error("Failed to create library:", error);
      toast.error("Failed to create library");
    } finally {
      setIsCreatingLibrary(false);
    }
  }, [newLibraryName, createLibrary, onUpdate, content]);

  const handleCreateFolder = useCallback(
    async (name: string, parentId?: string) => {
      try {
        await createFolder(
          name,
          parentId ? (parentId as Id<"documentFolders">) : undefined,
        );
        toast.success("Folder created");
      } catch (error) {
        console.error("Failed to create folder:", error);
        toast.error("Failed to create folder");
      }
    },
    [createFolder],
  );

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      try {
        await renameFolder(folderId as Id<"documentFolders">, name);
        toast.success("Folder renamed");
      } catch (error) {
        console.error("Failed to rename folder:", error);
        toast.error("Failed to rename folder");
      }
    },
    [renameFolder],
  );

  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      try {
        await removeFolder(folderId as Id<"documentFolders">);
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        toast.success("Folder deleted");
      } catch (error) {
        console.error("Failed to delete folder:", error);
        toast.error("Failed to delete folder");
      }
    },
    [removeFolder, selectedFolderId],
  );

  const handleFilesAccepted = useCallback(
    async (acceptedFiles: File[]) => {
      if (!libraryId) return;

      await uploadFiles(acceptedFiles, {
        siteId,
        libraryId,
        folderId: folderId ?? undefined,
        onSuccess: () => {
          toast.success("File uploaded");
        },
        onError: (error) => {
          toast.error(`Upload failed: ${error.message}`);
        },
      });
    },
    [siteId, libraryId, folderId, uploadFiles],
  );

  const handlePreviewFile = useCallback(
    (file: FileData) => {
      openFile({
        url: toProxyDownloadUrl(file.cdnUrl),
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
      });
    },
    [openFile],
  );

  const handleRenameFile = useCallback(
    async (fileId: string, newName: string) => {
      try {
        await renameFile(fileId as Id<"documents">, newName);
        toast.success("File renamed");
      } catch (error) {
        console.error("Failed to rename file:", error);
        toast.error("Failed to rename file");
      }
    },
    [renameFile],
  );

  const handleDeleteFile = useCallback(
    async (fileId: string) => {
      try {
        await removeFile(fileId as Id<"documents">);
        toast.success("File deleted");
      } catch (error) {
        console.error("Failed to delete file:", error);
        toast.error("Failed to delete file");
      }
    },
    [removeFile],
  );

  const handleSettingsChange = useCallback(
    (key: keyof LibraryContent, value: boolean | string) => {
      onUpdate({ ...content, [key]: value });
    },
    [content, onUpdate],
  );

  const handleNavigate = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
  }, []);

  const handleSelectFolderMobile = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    setIsFolderSheetOpen(false);
  }, []);

  // No library selected - show selector
  if (!content.libraryId) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 transition-colors hover:border-muted-foreground/50 hover:bg-muted/30">
        <div className="text-center space-y-3">
          <h3 className="text-base font-medium">Library</h3>
          <p className="text-xs text-muted-foreground">
            Select or create a library.
          </p>

          {libraries && libraries.length > 0 && (
            <Select onValueChange={handleSelectLibrary}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select a library" />
              </SelectTrigger>
              <SelectContent>
                {libraries.map((lib) => (
                  <SelectItem key={lib._id} value={lib._id}>
                    {lib.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Separator className="my-3" />

          <div className="space-y-2">
            <input
              type="text"
              placeholder="New library name"
              value={newLibraryName}
              onChange={(e) => setNewLibraryName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateLibrary();
              }}
            />
            <Button
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleCreateLibrary}
              disabled={!newLibraryName.trim() || isCreatingLibrary}
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentLibrary = libraries?.find((l) => l._id === content.libraryId);
  const showFolders = content.showFolderTree !== false;

  // Folder tree content - shared between desktop sidebar and mobile sheet
  const folderTreeContent = (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-2">
          {folders.length > 0 ? (
            <FolderTree
              folders={folders as FolderData[]}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(id) => {
                setSelectedFolderId(id);
                setIsFolderSheetOpen(false);
              }}
              onCreateFolder={handleCreateFolder}
              onRenameFolder={handleRenameFolder}
              onDeleteFolder={handleDeleteFolder}
            />
          ) : (
            <div className="text-center py-6">
              <p className="text-xs text-muted-foreground">No folders</p>
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-2 border-t flex-shrink-0">
        <CreateFolderButton
          onSubmit={(name) =>
            handleCreateFolder(name, selectedFolderId ?? undefined)
          }
        />
      </div>
    </div>
  );

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          {/* Mobile folder button */}
          {showFolders && (
            <Sheet open={isFolderSheetOpen} onOpenChange={setIsFolderSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 md:hidden"
                >
                  <FolderTreeIcon className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-3 border-b">
                  <SheetTitle className="text-sm">Folders</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-60px)]">{folderTreeContent}</div>
              </SheetContent>
            </Sheet>
          )}

          <span className="text-sm font-medium truncate">
            {currentLibrary?.name || "Library"}
          </span>
          <Breadcrumbs
            items={folderPath.map((f) => ({ id: f._id, name: f.name }))}
            onNavigate={handleNavigate}
          />
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                handleFilesAccepted(files);
              }
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline ml-1">
                  {uploadCount > 1 ? `(${uploadCount})` : "..."}
                </span>
              </>
            ) : (
              <>
                <Upload className="h-3 w-3" />
                <span className="hidden sm:inline ml-1">Upload</span>
              </>
            )}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56">
              <div className="space-y-3">
                <h4 className="font-medium text-xs">Display Settings</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="showFolderTree" className="text-xs">
                    Show folders
                  </Label>
                  <Switch
                    id="showFolderTree"
                    checked={content.showFolderTree !== false}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("showFolderTree", checked)
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="allowDownloads" className="text-xs">
                    Allow downloads
                  </Label>
                  <Switch
                    id="allowDownloads"
                    checked={content.allowDownloads !== false}
                    onCheckedChange={(checked) =>
                      handleSettingsChange("allowDownloads", checked)
                    }
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Content area */}
      <DropZone
        onFilesAccepted={handleFilesAccepted}
        className="border-0 rounded-none cursor-default"
        noClick
      >
        <div className="flex h-[220px]">
          {/* Desktop folder sidebar */}
          {showFolders && (
            <div className="hidden md:block w-32 lg:w-40 border-r bg-muted/30 flex-shrink-0">
              {folderTreeContent}
            </div>
          )}

          {/* File list */}
          <div className="flex-1 min-w-0">
            <ScrollArea className="h-full">
              <div className="p-2">
                {files.length > 0 ? (
                  <FileList
                    files={files as FileData[]}
                    onDownload={() => {}}
                    onPreview={handlePreviewFile}
                    onRename={handleRenameFile}
                    onDelete={handleDeleteFile}
                  />
                ) : (
                  <EmptyState type="files" />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DropZone>
    </div>
  );
}
