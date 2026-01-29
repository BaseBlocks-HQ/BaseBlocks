"use client";

import { useState, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ViewerProps } from "../types";
import { createBlobUrl, revokeBlobUrl } from "../utils";

export function PdfViewer({ file }: ViewerProps) {
  const [scale, setScale] = useState(100);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch PDF and create blob URL to bypass Content-Disposition: attachment
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError(null);

    createBlobUrl(file.url, "application/pdf")
      .then((url) => {
        if (mounted) {
          setBlobUrl(url);
          setIsLoading(false);
        } else {
          revokeBlobUrl(url);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
      if (blobUrl) {
        revokeBlobUrl(blobUrl);
      }
    };
  }, [file.url]);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        revokeBlobUrl(blobUrl);
      }
    };
  }, [blobUrl]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading PDF...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load PDF: {error}</p>
      </div>
    );
  }

  // Use browser's built-in PDF viewer with zoom parameter
  const pdfUrl = `${blobUrl}#zoom=${scale}&toolbar=1&navpanes=1`;

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
