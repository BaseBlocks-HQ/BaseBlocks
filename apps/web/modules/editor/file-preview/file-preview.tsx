"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
import {
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
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { getPreviewFileType, type PreviewFile } from "./types";
import { openInNewTab } from "./utils";
import { getViewer } from "./viewers";

interface FilePreviewProps {
  file: PreviewFile | null;
  onClose: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeIcon(contentType: string) {
  const type = getPreviewFileType(contentType);
  switch (type) {
    case "pdf":
    case "text":
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

export function FilePreview({ file, onClose }: FilePreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isOpeningExternal, setIsOpeningExternal] = useState(false);
  const [viewerControls, setViewerControls] = useState<ReactNode>(null);
  const fileUrl = file?.url;

  useEffect(() => {
    if (!fileUrl) {
      return;
    }
    setIsFullscreen(false);
    setIsOpeningExternal(false);
    setViewerControls(null);
  }, [fileUrl]);

  useEffect(() => {
    if (!file) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (isFullscreen) {
        setIsFullscreen(false);
        return;
      }
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [file, isFullscreen, onClose]);

  useEffect(() => {
    if (file && isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [file, isFullscreen]);

  const handleDownload = useCallback(() => {
    if (!file) return;

    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [file]);

  const handleOpenExternal = useCallback(async () => {
    if (!file || isOpeningExternal) return;

    setIsOpeningExternal(true);
    try {
      await openInNewTab(file.url, file.contentType);
    } finally {
      setIsOpeningExternal(false);
    }
  }, [file, isOpeningExternal]);

  const renderControls = useCallback((controls: ReactNode) => {
    setViewerControls(controls);
  }, []);

  if (!file) {
    return null;
  }

  const viewer = getViewer(file.contentType);
  const ViewerComponent = viewer.component;

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col border bg-background shadow-xl",
        isFullscreen
          ? "inset-0"
          : "inset-x-3 bottom-3 top-3 sm:inset-x-auto sm:bottom-0 sm:right-0 sm:top-0 sm:w-[50vw] sm:min-w-[400px] sm:max-w-[800px] sm:border-l",
      )}
    >
      <header className="flex shrink-0 items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {getFileTypeIcon(file.contentType)}
          <div className="min-w-0">
            <h2
              className="max-w-[200px] truncate text-sm font-medium"
              title={file.filename}
            >
              {file.filename}
            </h2>
          </div>
        </div>

        <div className="h-5 w-px bg-border" />

        {viewerControls && (
          <>
            <div className="flex items-center gap-1">{viewerControls}</div>
            <div className="h-5 w-px bg-border" />
          </>
        )}

        <div className="flex-1" />

        <span className="hidden text-xs text-muted-foreground sm:block">
          {formatFileSize(file.size)}
        </span>

        <div className="flex items-center gap-0.5">
          <Button
            className="h-8 w-8"
            disabled={isOpeningExternal}
            onClick={handleOpenExternal}
            size="icon"
            title="Open in new tab"
            variant="ghost"
          >
            {isOpeningExternal ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
          </Button>
          {file.allowDownload !== false && (
            <Button
              className="h-8 w-8"
              onClick={handleDownload}
              size="icon"
              title="Download"
              variant="ghost"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            className="h-8 w-8"
            onClick={() => setIsFullscreen((value) => !value)}
            size="icon"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            variant="ghost"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <div className="mx-1 h-5 w-px bg-border" />
          <Button
            className="h-8 w-8"
            onClick={onClose}
            size="icon"
            title="Close"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-hidden">
        <ViewerComponent
          key={file.url}
          file={file}
          onClose={onClose}
          renderControls={renderControls}
        />
      </main>
    </div>
  );
}
