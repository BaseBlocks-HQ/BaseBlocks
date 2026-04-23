"use client";

import { cn } from "@/lib/utils";
import type { LibraryFile } from "@/modules/library/types";
import type { MediaFile } from "@/modules/media-viewer/types";
import { getViewer } from "@/modules/media-viewer/viewers";
import { Button } from "@baseblocks/ui/button";
import {
  Download,
  ExternalLink,
  FileIcon,
  Maximize2,
  MoveRight,
  PanelLeft,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { type ReactNode, useState } from "react";

export function LibraryFileViewer({
  allowDownloads,
  file,
  onDelete,
  onClose,
  onMove,
  onOpenTree,
  onRename,
}: {
  allowDownloads: boolean;
  file: LibraryFile;
  onDelete?: () => void;
  onClose: () => void;
  onMove?: () => void;
  onOpenTree: () => void;
  onRename?: () => void;
}) {
  const [viewerControls, setViewerControls] = useState<ReactNode>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const mediaFile: MediaFile = {
    url: file.downloadUrl,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    allowDownload: allowDownloads,
  };
  const viewer = getViewer(file.contentType);
  const Viewer = viewer.component;

  const download = () => {
    const link = document.createElement("a");
    link.href = file.downloadUrl;
    link.download = file.filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background",
        fullscreen && "fixed inset-0 z-50",
      )}
    >
      <header className="grid min-h-12 min-w-0 grid-cols-[auto_minmax(0,1fr)_minmax(0,auto)] items-center gap-2 border-b bg-background/95 px-2 backdrop-blur sm:px-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 md:hidden"
            onClick={onOpenTree}
            title="Files"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileIcon className="h-4 w-4" />
          </span>
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-sm font-medium" title={file.filename}>
            {file.filename}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {viewer.label}
          </p>
        </div>

        <div className="flex min-w-0 max-w-full items-center justify-end gap-1 overflow-x-auto">
          {viewerControls ? (
            <div className="hidden min-w-0 items-center gap-1 md:flex">
              {viewerControls}
            </div>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => window.open(file.downloadUrl, "_blank", "noopener")}
            title="Open in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          {allowDownloads ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={download}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          ) : null}
          {onRename ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onRename}
              title="Rename"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
          {onMove ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={onMove}
              title="Move"
            >
              <MoveRight className="h-4 w-4" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setFullscreen((value) => !value)}
            title="Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={onClose}
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Viewer
          key={file._id}
          file={mediaFile}
          onClose={onClose}
          renderControls={setViewerControls}
        />
      </main>
    </section>
  );
}
