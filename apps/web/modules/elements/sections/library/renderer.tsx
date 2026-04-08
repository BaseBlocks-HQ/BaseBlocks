"use client";

import {
  type FileData,
  type FolderData,
  usePublicFiles,
  usePublicFolderPath,
  usePublicFolders,
  usePublicLibrary,
} from "@/modules/documents";
import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import { useMediaViewer } from "@/modules/media-viewer";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { Download, Eye } from "lucide-react";
import { useState } from "react";
import { LibraryBrowser } from "./components/library-browser";
import { LibraryContentList } from "./components/library-content-list";
import { useContainerWidth } from "./hooks/use-container-width";

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  const [containerRef, containerWidth] = useContainerWidth();
  const showSidebar = containerWidth >= 560;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
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

  const selectFolder = (folderKey: string | null) => {
    setSelectedFolderId(folderKey);
    if (folderKey) {
      setExpandedFolders((prev) => new Set(prev).add(folderKey));
    }
  };

  const downloadFile = (fileUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const previewFile = (file: FileData) => {
    openFile({
      url: file.downloadUrl,
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
  const showFolders = content.showFolderTree !== false;
  const currentLocation =
    folderPath.length > 0
      ? folderPath[folderPath.length - 1]!.name
      : library.name;

  return (
    <LibraryBrowser
      containerRef={containerRef}
      libraryName={library.name}
      currentLocation={currentLocation}
      folderPath={folderPath}
      folders={folders}
      expandedFolders={expandedFolders}
      selectedFolderId={selectedFolderId}
      showFolderTree={showFolders}
      showSidebar={showSidebar}
      onSelectFolder={selectFolder}
      onToggleFolder={toggleFolder}
    >
      <LibraryContentList
        subfolders={currentSubfolders as FolderData[]}
        files={sortedFiles as FileData[]}
        onSelectFolder={selectFolder}
        onOpenFile={previewFile}
        renderFileActions={(file) => (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(event) => {
                event.stopPropagation();
                previewFile(file);
              }}
              title="Preview"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {content.allowDownloads !== false ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(event) => {
                  event.stopPropagation();
                  downloadFile(file.downloadUrl, file.filename);
                }}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            ) : null}
          </>
        )}
      />
    </LibraryBrowser>
  );
}
