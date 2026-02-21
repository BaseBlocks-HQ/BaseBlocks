"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  File,
  FileImage,
  FileText,
  FileVideo,
  Loader2,
  Maximize2,
  Minimize2,
  Music,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { useMediaViewer } from "./context";
import { getMediaFileType } from "./types";
import { openInNewTab } from "./utils";
import { getViewer } from "./viewers";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(contentType: string) {
  const type = getMediaFileType(contentType);
  switch (type) {
    case "pdf":
    case "text":
    case "office":
      return <FileText className="h-4 w-4" />;
    case "image":
      return <FileImage className="h-4 w-4" />;
    case "video":
      return <FileVideo className="h-4 w-4" />;
    case "audio":
      return <Music className="h-4 w-4" />;
    default:
      return <File className="h-4 w-4" />;
  }
}

export function MediaViewerPanel() {
  const {
    currentFile,
    isOpen,
    isFullscreen,
    toggleFullscreen,
    closeFile,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
    files,
    currentIndex,
  } = useMediaViewer();

  // State to hold viewer-specific controls
  const [viewerControls, setViewerControls] = useState<ReactNode>(null);

  // Reset viewer controls when file changes
  useEffect(() => {
    setViewerControls(null);
  }, [currentFile?.url]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          if (isFullscreen) {
            toggleFullscreen();
          } else {
            closeFile();
          }
          break;
        case "ArrowRight":
          if (hasNext) goToNext();
          break;
        case "ArrowLeft":
          if (hasPrevious) goToPrevious();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    isFullscreen,
    closeFile,
    toggleFullscreen,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
  ]);

  const handleDownload = () => {
    if (!currentFile) return;
    const link = document.createElement("a");
    link.href = currentFile.url;
    link.download = currentFile.filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isOpeningExternal, setIsOpeningExternal] = useState(false);

  const handleOpenExternal = async () => {
    if (!currentFile || isOpeningExternal) return;
    setIsOpeningExternal(true);
    try {
      await openInNewTab(currentFile.url, currentFile.contentType);
    } finally {
      setIsOpeningExternal(false);
    }
  };

  // Callback for viewers to register their controls
  const handleRenderControls = (controls: ReactNode) => {
    setViewerControls(controls);
  };

  if (!isOpen || !currentFile) {
    return null;
  }

  const viewer = getViewer(currentFile.contentType);
  const ViewerComponent = viewer.component;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Unified Header/Toolbar */}
      <header className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        {/* File info */}
        <div className="flex items-center gap-2 min-w-0">
          {getFileTypeIcon(currentFile.contentType)}
          <div className="min-w-0">
            <h2
              className="text-sm font-medium truncate max-w-[180px]"
              title={currentFile.filename}
            >
              {currentFile.filename}
            </h2>
          </div>
        </div>

        {/* Separator */}
        <div className="w-px h-5 bg-border" />

        {/* Viewer-specific controls */}
        {viewerControls && (
          <>
            <div className="flex items-center gap-1">{viewerControls}</div>
            <div className="w-px h-5 bg-border" />
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* File metadata (compact) */}
        <span className="text-xs text-muted-foreground hidden sm:block">
          {currentFile.size && formatFileSize(currentFile.size)}
          {files.length > 1 && ` • ${currentIndex + 1}/${files.length}`}
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleOpenExternal}
            disabled={isOpeningExternal}
            title="Open in new tab"
          >
            {isOpeningExternal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
          </Button>
          {currentFile.allowDownload !== false && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDownload}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={closeFile}
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        {/* Navigation arrows for gallery mode */}
        {hasPrevious && (
          <button
            type="button"
            onClick={goToPrevious}
            className={cn(
              "absolute left-2 top-1/2 -translate-y-1/2 z-10",
              "w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border shadow-md",
              "flex items-center justify-center",
              "hover:bg-background transition-colors",
            )}
            title="Previous (←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={goToNext}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 z-10",
              "w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm border shadow-md",
              "flex items-center justify-center",
              "hover:bg-background transition-colors",
            )}
            title="Next (→)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Viewer component */}
        <ViewerComponent
          file={currentFile}
          onClose={closeFile}
          renderControls={handleRenderControls}
        />
      </main>

      {/* Gallery indicator (for multiple files) */}
      {files.length > 1 && (
        <footer className="flex items-center justify-center gap-1 py-2 border-t bg-muted/30 shrink-0">
          {files.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-colors",
                index === currentIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30",
              )}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
