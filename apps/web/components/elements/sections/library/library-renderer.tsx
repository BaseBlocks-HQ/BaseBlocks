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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import type { Id } from "@repo/backend";
import {
  ChevronRight,
  Download,
  Eye,
  Folder,
  FolderOpen,
  Home,
  Menu,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);

  const showSidebar = containerWidth >= 400;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [folderMenuOpen, setFolderMenuOpen] = useState(false);
  const [breadcrumbOpen, setBreadcrumbOpen] = useState(false);
  const { openFile } = useMediaViewer();

  const libraryId = content.libraryId
    ? (content.libraryId as Id<"documentLibraries">)
    : null;
  const folderId = selectedFolderId
    ? (selectedFolderId as Id<"documentFolders">)
    : null;

  const library = usePublicLibrary(libraryId);
  const folders = usePublicFolders(libraryId);
  const files = usePublicFiles(libraryId, folderId);
  const folderPath = usePublicFolderPath(folderId);

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

  const handleSelectFolder = useCallback((folderId: string | null, closeMenu = false) => {
    setSelectedFolderId(folderId);
    if (folderId) {
      setExpandedFolders((prev) => new Set(prev).add(folderId));
    }
    if (closeMenu) {
      setFolderMenuOpen(false);
    }
    setBreadcrumbOpen(false);
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
        allowDownload: content.allowDownloads !== false,
      });
    },
    [openFile, content.allowDownloads],
  );

  if (!libraryId || !library) {
    return (
      <div ref={containerRef} className="border rounded-lg p-6 text-center text-muted-foreground text-sm">
        No library configured
      </div>
    );
  }

  const buildFolderTree = (parentId?: string) => {
    return folders
      .filter((f) => f.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const hasChildren = (folderId: string) => {
    return folders.some((f) => f.parentId === folderId);
  };

  const renderFolderTree = (
    parentId?: string,
    level = 0,
    closeOnSelect = false,
  ) => {
    const children = buildFolderTree(parentId);

    return children.map((folder) => {
      const isExpanded = expandedFolders.has(folder._id);
      const isSelected = selectedFolderId === folder._id;
      const hasSubfolders = hasChildren(folder._id);

      return (
        <div key={folder._id}>
          <div
            className={cn(
              "flex items-center gap-1 py-1 px-2 rounded cursor-pointer text-sm",
              isSelected ? "bg-accent" : "hover:bg-muted/50",
            )}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => handleSelectFolder(folder._id, closeOnSelect)}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(folder._id);
              }}
              className={cn(
                "shrink-0 h-4 w-4 flex items-center justify-center",
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
              <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <span className="truncate flex-1 min-w-0">{folder.name}</span>
          </div>
          {isExpanded && renderFolderTree(folder._id, level + 1, closeOnSelect)}
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

  // Current location display text
  const lastFolder = folderPath.length > 0 ? folderPath[folderPath.length - 1] : null;
  const currentLocation = lastFolder?.name ?? library.name;

  // Breadcrumb navigation popover content
  const breadcrumbNavContent = (
    <div className="py-1">
      <button
        type="button"
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded",
          !selectedFolderId && "bg-accent"
        )}
        onClick={() => handleSelectFolder(null)}
      >
        <Home className="h-3.5 w-3.5" />
        <span className="truncate">{library.name}</span>
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
          onClick={() => handleSelectFolder(folder._id)}
        >
          <Folder className="h-3.5 w-3.5" />
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  );

  // Sidebar header with breadcrumb
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
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="start" className="w-48 p-0">
          {breadcrumbNavContent}
        </PopoverContent>
      </Popover>
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
      <ScrollArea className="flex-1">
        <div className="py-1">{renderFolderTree(undefined, 0, true)}</div>
      </ScrollArea>
    </div>
  );

  return (
    <div ref={containerRef} className="w-full border rounded-lg overflow-hidden">
      <div className="flex h-52">
        {/* Sidebar - shown when container is wide enough */}
        {showFolders && showSidebar && (
          <div className="flex flex-col w-36 border-r bg-muted/20 shrink-0 overflow-hidden">
            {sidebarHeader}
            <div className="flex-1 overflow-auto py-1">
              {renderFolderTree(undefined, 0, false)}
            </div>
          </div>
        )}

        {/* File list area */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Compact header for mobile */}
          {showFolders && !showSidebar && (
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
            </div>
          )}

          {/* File list */}
          <ScrollArea className="flex-1 min-w-0">
            {sortedFiles.length > 0 ? (
              <div className="p-1.5 space-y-0.5">
                {sortedFiles.map((file) => (
                  <div
                    key={file._id}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 cursor-pointer group"
                    onClick={() => handlePreview(file)}
                  >
                    <div
                      className={cn(
                        "shrink-0",
                        getFileTypeColor(file.contentType),
                      )}
                    >
                      <FileIcon contentType={file.contentType} className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <MiddleTruncate
                        text={file.filename}
                        className="text-sm"
                        endChars={10}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(file);
                        }}
                        title="Preview"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {content.allowDownloads !== false && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(file.cdnUrl, file.filename);
                          }}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
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
        </div>
      </div>
    </div>
  );
}
