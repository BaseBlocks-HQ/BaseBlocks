"use client";
import { cn } from "@/lib/utils";
import type { LibraryFile } from "@/modules/library/types";
import { ViewerToolbarIconButton } from "@/modules/media-viewer/components/viewer-toolbar-icon-button";
import type { MediaFile } from "@/modules/media-viewer/types";
import { getViewer } from "@/modules/media-viewer/viewers";
import { ExternalLink, Maximize2, Minimize2, PanelLeft, X } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";

export function LibraryFileViewer({
  allowDownloads,
  file,
  onClose,
  onOpenTree,
}: {
  allowDownloads: boolean;
  file: LibraryFile;
  onClose: () => void;
  onOpenTree: () => void;
}) {
  const [viewerControls, setViewerControls] = useState<ReactNode>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const mediaFile: MediaFile = {
    url: file.downloadUrl,
    filename: file.filename,
    contentType: file.contentType,
    size: file.size,
    allowDownload: allowDownloads,
    deepLinkId: file._id,
  };
  const viewer = getViewer(file.contentType);
  const Viewer = viewer.component;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <section
      className={cn(
        "relative flex h-full min-h-0 min-w-0 flex-1 overflow-hidden bg-card",
        fullscreen && "fixed inset-0 z-50",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex h-10 items-center justify-between gap-2 px-2">
        <div className="pointer-events-auto flex shrink-0 items-center gap-1.5 md:hidden">
          <ViewerToolbarIconButton label="Files" onClick={onOpenTree}>
            <PanelLeft className="h-4 w-4" />
          </ViewerToolbarIconButton>
        </div>
        <div className="pointer-events-auto flex min-w-0 items-center justify-end gap-1.5 overflow-x-auto">
          {viewerControls}
          <ViewerToolbarIconButton
            label="Open in new tab"
            onClick={() => window.open(file.downloadUrl, "_blank", "noopener")}
          >
            <ExternalLink className="h-4 w-4" />
          </ViewerToolbarIconButton>
          <ViewerToolbarIconButton
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </ViewerToolbarIconButton>
          <ViewerToolbarIconButton label="Close (Esc)" onClick={onClose}>
            <X className="h-4 w-4" />
          </ViewerToolbarIconButton>
        </div>
      </div>
      <main className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
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
