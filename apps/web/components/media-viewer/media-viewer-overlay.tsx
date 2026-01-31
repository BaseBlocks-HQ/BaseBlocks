"use client";

import { cn } from "@/lib/utils";
import { useMediaViewer } from "./context";
import { MediaViewerPanel } from "./media-viewer-panel";

/**
 * Overlay component that shows the media viewer as a side panel or fullscreen.
 * Renders as a fixed position element, doesn't wrap any children.
 */
export function MediaViewerOverlay() {
  const { isOpen, isFullscreen } = useMediaViewer();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed z-50 bg-background shadow-xl",
        isFullscreen
          ? "inset-0"
          : "top-0 right-0 bottom-0 w-[45vw] min-w-[400px] max-w-[800px] border-l"
      )}
    >
      <MediaViewerPanel />
    </div>
  );
}
