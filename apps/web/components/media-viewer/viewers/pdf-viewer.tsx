"use client";

import { useState, useCallback } from "react";
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ViewerProps } from "../types";

export function PdfViewer({ file }: ViewerProps) {
  const [scale, setScale] = useState(100);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 25, 300));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 25, 50));
  }, []);

  const handleFullscreen = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>("#pdf-iframe");
    if (iframe) {
      iframe.requestFullscreen?.();
    }
  }, []);

  // Use browser's built-in PDF viewer with zoom parameter
  const pdfUrl = `${file.url}#zoom=${scale}&toolbar=1&navpanes=1`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          disabled={scale <= 50}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
          {scale}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          disabled={scale >= 300}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-2" />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleFullscreen}
          title="Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* PDF iframe */}
      <div className="flex-1 bg-muted/20">
        <iframe
          id="pdf-iframe"
          src={pdfUrl}
          className="w-full h-full border-0"
          title={file.filename}
        />
      </div>
    </div>
  );
}
