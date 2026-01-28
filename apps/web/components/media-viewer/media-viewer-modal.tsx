"use client";

import { useEffect, useCallback } from "react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  FileImage,
  FileVideo,
  Music,
  File,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMediaViewer } from "./context";
import { getViewer } from "./viewers";
import { getMediaFileType } from "./types";

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

export function MediaViewerModal() {
  const {
    currentFile,
    isOpen,
    closeFile,
    goToNext,
    goToPrevious,
    hasNext,
    hasPrevious,
    files,
    currentIndex,
  } = useMediaViewer();

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "Escape":
          closeFile();
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
  }, [isOpen, closeFile, goToNext, goToPrevious, hasNext, hasPrevious]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleDownload = useCallback(() => {
    if (!currentFile) return;
    const link = document.createElement("a");
    link.href = currentFile.url;
    link.download = currentFile.filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentFile]);

  const handleOpenExternal = useCallback(() => {
    if (!currentFile) return;
    window.open(currentFile.url, "_blank", "noopener,noreferrer");
  }, [currentFile]);

  if (!isOpen || !currentFile) {
    return null;
  }

  const viewer = getViewer(currentFile.contentType);
  const ViewerComponent = viewer.component;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {getFileTypeIcon(currentFile.contentType)}
          <div className="min-w-0">
            <h2 className="font-medium truncate">{currentFile.filename}</h2>
            <p className="text-xs text-muted-foreground">
              {viewer.label}
              {currentFile.size && ` • ${formatFileSize(currentFile.size)}`}
              {files.length > 1 && ` • ${currentIndex + 1} of ${files.length}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleOpenExternal}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownload}
            title="Download"
          >
            <Download className="h-4 w-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-2" />
          <Button
            variant="ghost"
            size="icon"
            onClick={closeFile}
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
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
              "absolute left-4 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg",
              "flex items-center justify-center",
              "hover:bg-background transition-colors"
            )}
            title="Previous (←)"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        {hasNext && (
          <button
            type="button"
            onClick={goToNext}
            className={cn(
              "absolute right-4 top-1/2 -translate-y-1/2 z-10",
              "w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg",
              "flex items-center justify-center",
              "hover:bg-background transition-colors"
            )}
            title="Next (→)"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        {/* Viewer component */}
        <ViewerComponent file={currentFile} onClose={closeFile} />
      </main>

      {/* Gallery indicator (for multiple files) */}
      {files.length > 1 && (
        <footer className="flex items-center justify-center gap-1.5 p-3 border-t bg-background/80 backdrop-blur-sm">
          {files.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentIndex
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              )}
            />
          ))}
        </footer>
      )}
    </div>
  );
}
