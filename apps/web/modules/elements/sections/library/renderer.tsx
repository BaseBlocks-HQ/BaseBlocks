"use client";

import { toProxyDownloadUrl } from "@/lib/storage/client";
import {
  usePublicFiles,
  usePublicFolderPath,
  usePublicFolders,
  usePublicLibrary,
} from "@/modules/documents";
import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import { useMediaViewer } from "@/modules/media-viewer";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { FolderOpen, Menu } from "lucide-react";
import { useState } from "react";
import { LibraryBreadcrumbTrigger } from "./components/library-breadcrumb-trigger";
import { LibraryFileList } from "./components/library-file-list";
import { LibraryFolderTree } from "./components/library-folder-tree";
import { useContainerWidth } from "./hooks/use-container-width";

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  const [containerRef, containerWidth] = useContainerWidth();
  const showSidebar = containerWidth >= 400;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
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

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderKey)) {
        next.delete(folderKey);
      } else {
        next.add(folderKey);
      }
      return next;
    });
  };

  const selectFolder = (folderKey: string | null, closeMenu = false) => {
    setSelectedFolderId(folderKey);
    if (folderKey) {
      setExpandedFolders((prev) => new Set(prev).add(folderKey));
    }
    if (closeMenu) {
      setFolderMenuOpen(false);
    }
    setBreadcrumbOpen(false);
  };

  const downloadFile = (cdnUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = toProxyDownloadUrl(cdnUrl);
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewFile = (file: (typeof files)[number]) => {
    openFile({
      url: toProxyDownloadUrl(file.cdnUrl),
      filename: file.filename,
      contentType: file.contentType,
      size: file.size,
      allowDownload: content.allowDownloads !== false,
    });
  };

  if (!libraryId || !library) {
    return (
      <div
        ref={containerRef}
        className="border rounded-lg p-6 text-center text-muted-foreground text-sm"
      >
        No library configured
      </div>
    );
  }

  const sortedFiles = [...files].sort((a, b) =>
    a.filename.localeCompare(b.filename),
  );
  const currentSubfolders = folders
    .filter((folder) => folder.parentId === (selectedFolderId ?? undefined))
    .sort((a, b) => a.order - b.order);
  const hasContent = sortedFiles.length > 0 || currentSubfolders.length > 0;
  const showFolders = content.showFolderTree !== false;
  const currentLocation =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1]!.name
      : library.name;

  const breadcrumbNavContent = (
    <div className="py-1">
      <button
        type="button"
        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded"
        onClick={() => selectFolder(null)}
      >
        <span className="truncate">{library.name}</span>
      </button>
      {folderPath.map((folder, index) => (
        <button
          key={folder._id}
          type="button"
          className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded"
          style={{ paddingLeft: `${(index + 1) * 12 + 12}px` }}
          onClick={() => selectFolder(folder._id)}
        >
          <span className="truncate">{folder.name}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="w-full border rounded-lg overflow-hidden"
    >
      <div className="flex h-100">
        {showFolders && showSidebar && (
          <div className="flex flex-col w-36 border-r bg-muted/20 shrink-0 overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
              <Popover open={breadcrumbOpen} onOpenChange={setBreadcrumbOpen}>
                <PopoverTrigger asChild>
                  <LibraryBreadcrumbTrigger
                    folderPath={folderPath}
                    currentLocation={currentLocation}
                  />
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-48 p-0"
                >
                  {breadcrumbNavContent}
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 overflow-auto py-1">
              <LibraryFolderTree
                folders={folders}
                expandedFolders={expandedFolders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={(folderKey) => selectFolder(folderKey)}
                onToggleFolder={toggleFolder}
              />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {showFolders && !showSidebar && (
            <div className="flex items-center gap-1 px-1.5 py-1 border-b bg-muted/30 shrink-0">
              <Popover open={folderMenuOpen} onOpenChange={setFolderMenuOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                  >
                    <Menu className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-56 p-0"
                >
                  <div className="flex flex-col max-h-72 overflow-hidden">
                    <div className="border-b">{breadcrumbNavContent}</div>
                    <ScrollArea className="flex-1">
                      <div className="py-1">
                        <LibraryFolderTree
                          folders={folders}
                          expandedFolders={expandedFolders}
                          selectedFolderId={selectedFolderId}
                          onSelectFolder={(folderKey) =>
                            selectFolder(folderKey, true)
                          }
                          onToggleFolder={toggleFolder}
                        />
                      </div>
                    </ScrollArea>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover open={breadcrumbOpen} onOpenChange={setBreadcrumbOpen}>
                <PopoverTrigger asChild>
                  <LibraryBreadcrumbTrigger
                    folderPath={folderPath}
                    currentLocation={currentLocation}
                  />
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  className="w-48 p-0"
                >
                  {breadcrumbNavContent}
                </PopoverContent>
              </Popover>
            </div>
          )}

          {hasContent ? (
            <ScrollArea className="flex-1 min-w-0">
              <LibraryFileList
                subfolders={currentSubfolders}
                files={sortedFiles}
                allowDownloads={content.allowDownloads !== false}
                onSelectFolder={(folderKey) => selectFolder(folderKey)}
                onPreviewFile={(file) =>
                  previewFile(file as (typeof files)[number])
                }
                onDownloadFile={(file) =>
                  downloadFile(
                    (file as (typeof files)[number]).cdnUrl,
                    file.filename,
                  )
                }
              />
            </ScrollArea>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <FolderOpen
                className="h-10 w-10 mb-3 opacity-30"
                strokeWidth={1.5}
              />
              <p className="text-sm font-medium">No files yet</p>
              <p className="text-xs opacity-60 mt-0.5">This folder is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
