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
  InlineDropZone,
  UploadProgressList,
  useDocumentLibrary,
  useFileOperations,
  useFolderOperations,
  useFolderPath,
} from "@/components/document-library";
import { useEditorContext } from "@/components/editor";
import { useMediaViewer } from "@/components/media-viewer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useFileUpload } from "@/lib/storage";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import type { LibraryContent } from "@/types";
import type { Id } from "@repo/backend";
import { Plus, Settings2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { BlockEditorBaseProps } from "../types";

export function LibraryEditor({
  block,
  isSelected,
  onUpdate,
}: BlockEditorBaseProps) {
  const content = block.content as LibraryContent;
  const { siteId } = useEditorContext();
  const { openFile } = useMediaViewer();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isCreatingLibrary, setIsCreatingLibrary] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState("");

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

  // Filter to only show uploads that are in progress
  const activeUploads = Object.fromEntries(
    Object.entries(uploadStates).filter(([, state]) => state.isUploading),
  );

  // Select library
  const handleSelectLibrary = useCallback(
    async (newLibraryId: string) => {
      await onUpdate({ ...content, libraryId: newLibraryId });
      setSelectedFolderId(null);
    },
    [content, onUpdate],
  );

  // Create new library
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

  // Folder operations
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

  // File operations
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

  const handleDownloadFile = useCallback((file: FileData) => {
    // The FileList component handles opening the download URL
  }, []);

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

  // Settings update
  const handleSettingsChange = useCallback(
    (key: keyof LibraryContent, value: boolean | string) => {
      onUpdate({ ...content, [key]: value });
    },
    [content, onUpdate],
  );

  // Navigate via breadcrumbs
  const handleNavigate = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
  }, []);

  // Render library selector when no library is selected
  if (!content.libraryId) {
    return (
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 transition-colors hover:border-muted-foreground/50 hover:bg-muted/30">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-medium">Library</h3>
            <p className="text-sm text-muted-foreground">
              Select an existing library or create a new one.
            </p>

            {libraries && libraries.length > 0 && (
              <div className="max-w-xs mx-auto">
                <Select onValueChange={handleSelectLibrary}>
                  <SelectTrigger>
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
              </div>
            )}

            <Separator className="my-4" />

            <div className="flex items-center gap-2 justify-center max-w-xs mx-auto">
              <input
                type="text"
                placeholder="New library name"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-md"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateLibrary();
                }}
              />
              <Button
                size="sm"
                onClick={handleCreateLibrary}
                disabled={!newLibraryName.trim() || isCreatingLibrary}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </div>
          </div>
      </div>
    );
  }

  // Get current library info
  const currentLibrary = libraries?.find((l) => l._id === content.libraryId);

  return (
    <div className="border rounded-lg overflow-hidden transition-colors hover:border-muted-foreground/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b">
          <div className="flex items-center gap-3">
            <span className="font-medium">
              {currentLibrary?.name || "Library"}
            </span>
            <Breadcrumbs
              items={folderPath.map((f) => ({ id: f._id, name: f.name }))}
              onNavigate={handleNavigate}
            />
          </div>
          <div className="flex items-center gap-2">
            <CreateFolderButton
              onSubmit={(name) =>
                handleCreateFolder(name, selectedFolderId ?? undefined)
              }
            />

            {/* Settings popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Display Settings</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showFolderTree" className="text-sm">
                      Show folder tree
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
                    <Label htmlFor="allowDownloads" className="text-sm">
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
        >
          <div className="flex h-[300px]">
            {/* Folder tree sidebar */}
            {content.showFolderTree !== false && (
              <div className="w-48 border-r bg-muted/30 p-2 overflow-y-auto">
                {folders.length > 0 ? (
                  <FolderTree
                    folders={folders as FolderData[]}
                    selectedFolderId={selectedFolderId}
                    onSelectFolder={setSelectedFolderId}
                    onCreateFolder={handleCreateFolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-xs text-muted-foreground">No folders</p>
                  </div>
                )}
              </div>
            )}

            {/* File area */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Upload progress - only show while uploading */}
              {Object.keys(activeUploads).length > 0 && (
                <div className="px-4 py-2 border-b bg-muted/30">
                  <UploadProgressList uploads={activeUploads} />
                </div>
              )}

              {/* File list */}
              <div className="flex-1 p-2 overflow-y-auto">
                {files.length > 0 ? (
                  <FileList
                    files={files as FileData[]}
                    onDownload={handleDownloadFile}
                    onPreview={handlePreviewFile}
                    onRename={handleRenameFile}
                    onDelete={handleDeleteFile}
                  />
                ) : (
                  <EmptyState type="files" />
                )}
              </div>

              {/* Compact upload bar */}
              <div className="px-3 py-2 border-t bg-muted/30">
                <InlineDropZone onFilesAccepted={handleFilesAccepted} />
              </div>
            </div>
          </div>
        </DropZone>
    </div>
  );
}
