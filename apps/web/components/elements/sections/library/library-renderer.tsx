"use client";

import {
  FileIcon,
  getFileTypeColor,
  usePublicFiles,
  usePublicFolderPath,
  usePublicFolders,
  usePublicLibrary,
} from "@/components/document-library";
import type { ElementRendererProps } from "@/components/elements/registry";
import { useMediaViewer } from "@/components/media-viewer";
import { Button } from "@/components/ui/button";
import { MiddleTruncate } from "@/components/ui/middle-truncate";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import type { Id } from "@repo/backend";
import {
  ChevronRight,
  Download,
  Eye,
  Folder,
  FolderOpen,
  FolderTree,
  Home,
} from "lucide-react";
import { useCallback, useState } from "react";

interface LibraryRendererProps extends ElementRendererProps<"library"> {
  accessToken?: string;
}

export function LibraryRenderer({
  content,
  accessToken,
}: LibraryRendererProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isFolderSheetOpen, setIsFolderSheetOpen] = useState(false);
  const { openFile } = useMediaViewer();

  const libraryId = content.libraryId
    ? (content.libraryId as Id<"documentLibraries">)
    : null;
  const folderId = selectedFolderId
    ? (selectedFolderId as Id<"documentFolders">)
    : null;

  const library = usePublicLibrary(libraryId, accessToken);
  const folders = usePublicFolders(libraryId, accessToken);
  const files = usePublicFiles(libraryId, folderId, accessToken);
  const folderPath = usePublicFolderPath(folderId, accessToken);

  const handleToggleExpand = useCallback((folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const handleSelectFolder = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    if (folderId) {
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
  }, []);

  const handleSelectFolderMobile = useCallback((folderId: string | null) => {
    setSelectedFolderId(folderId);
    if (folderId) {
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
    setIsFolderSheetOpen(false);
  }, []);

  const handleDownload = useCallback((cdnUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = toProxyDownloadUrl(cdnUrl);
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handlePreview = useCallback(
    (file: (typeof files)[number]) => {
      openFile({
        url: toProxyDownloadUrl(file.cdnUrl),
        filename: file.filename,
        contentType: file.contentType,
        size: file.size,
      });
    },
    [openFile],
  );

  if (!libraryId || !library) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        No library configured
      </div>
    );
  }

  // Build folder tree structure
  const buildFolderTree = (parentId?: string) => {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const hasChildren = (folderId: string) => {
    return folders.some((f) => f.parentId === folderId);
  };

  // Render folder tree recursively
  const renderFolderTree = (
    parentId?: string,
    level = 0,
    onSelect?: (id: string | null) => void,
  ) => {
    const children = buildFolderTree(parentId);
    const selectFn = onSelect || handleSelectFolder;

    return children.map((folder) => {
      const isExpanded = expandedFolders.has(folder._id);
      const isSelected = selectedFolderId === folder._id;
      const hasSubfolders = hasChildren(folder._id);

      return (
        <div key={folder._id}>
          <div
            className={cn(
              "flex items-center gap-1 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
              isSelected
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted/50",
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => selectFn(folder._id)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(folder._id);
              }}
              className={cn(
                "flex-shrink-0 h-4 w-4 flex items-center justify-center",
                !hasSubfolders && "invisible",
              )}
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform",
                  isExpanded && "rotate-90",
                )}
              />
            </button>
            {isExpanded ? (
              <FolderOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <span className="text-sm truncate">{folder.name}</span>
          </div>
          {isExpanded && renderFolderTree(folder._id, level + 1, onSelect)}
        </div>
      );
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const sortedFiles = [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );

  const showFolders = content.showFolderTree !== false;

  // Folder tree content - shared between desktop and mobile
  const folderTreeContent = (onSelect?: (id: string | null) => void) => (
    <ScrollArea className="h-full">
      <div className="py-2">{renderFolderTree(undefined, 0, onSelect)}</div>
    </ScrollArea>
  );

  // File list content
  const fileListContent = (
    <ScrollArea className="h-full">
      {sortedFiles.length > 0 ? (
        <div className="p-2 space-y-1">
          {sortedFiles.map((file) => (
            <div
              key={file._id}
              className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => handlePreview(file)}
            >
              <div
                className={cn(
                  "flex-shrink-0",
                  getFileTypeColor(file.contentType),
                )}
              >
                <FileIcon contentType={file.contentType} className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <MiddleTruncate
                  text={file.filename}
                  className="text-sm font-medium"
                  endChars={12}
                />
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(file);
                  }}
                  title="Preview"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {content.allowDownloads !== false && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(file.cdnUrl, file.filename);
                    }}
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          No files in this folder
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="w-full border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-muted/50 border-b">
        <div className="flex items-center gap-2 text-sm overflow-hidden">
          {/* Mobile folder button */}
          {showFolders && (
            <Sheet open={isFolderSheetOpen} onOpenChange={setIsFolderSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 flex-shrink-0 md:hidden"
                >
                  <FolderTree className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <SheetHeader className="p-3 border-b">
                  <SheetTitle className="text-sm">Folders</SheetTitle>
                </SheetHeader>
                <div className="h-[calc(100vh-60px)]">
                  {folderTreeContent(handleSelectFolderMobile)}
                </div>
              </SheetContent>
            </Sheet>
          )}

          <button
            type="button"
            onClick={() => handleSelectFolder(null)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">{library.name}</span>
          </button>
          {folderPath.map((folder, index) => (
            <div key={folder._id} className="flex items-center min-w-0">
              <ChevronRight className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
              {index === folderPath.length - 1 ? (
                <span className="font-medium truncate">{folder.name}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSelectFolder(folder._id)}
                  className="text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {folder.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex h-[250px]">
        {/* Desktop folder sidebar */}
        {showFolders && (
          <div className="hidden md:block w-32 lg:w-40 border-r bg-muted/30 flex-shrink-0 overflow-hidden">
            {folderTreeContent()}
          </div>
        )}

        {/* File list */}
        <div className="flex-1 min-w-0">{fileListContent}</div>
      </div>
    </div>
  );
}
