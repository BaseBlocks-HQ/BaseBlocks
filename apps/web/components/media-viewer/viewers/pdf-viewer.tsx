"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { ViewerProps } from "../types";
import { createBlobUrl, revokeBlobUrl } from "../utils";

export function PdfViewer({ file, renderControls }: ViewerProps) {
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

  // Register controls with parent
  useEffect(() => {
    if (!renderControls || isLoading || error) return;

    renderControls(
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomOut}
          disabled={scale <= 50}
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground min-w-[3rem] text-center tabular-nums">
          {scale}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleZoomIn}
          disabled={scale >= 300}
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </>
    );
  }, [renderControls, scale, isLoading, error, handleZoomIn, handleZoomOut]);

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
    <div className="h-full bg-muted/20">
      <iframe
        id="pdf-iframe"
        src={pdfUrl}
        className="w-full h-full border-0"
        title={file.filename}
      />
    </div>
  );
}
