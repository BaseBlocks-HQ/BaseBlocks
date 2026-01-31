"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import type { ViewerProps } from "../types";

/**
 * Office document viewer using Microsoft Office Online Viewer
 *
 * Note: This uses Microsoft's public document viewer which requires the document
 * to be publicly accessible via URL. For private documents, consider:
 * 1. Using a signed URL with sufficient TTL
 * 2. Converting to PDF server-side
 * 3. Using a different viewer library
 */
export function OfficeViewer({ file, renderControls }: ViewerProps) {
  const [useOnlineViewer, setUseOnlineViewer] = useState(true);

  // Microsoft Office Online viewer URL
  // This works for publicly accessible documents
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;

  // Google Docs viewer as fallback
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;

  // Register controls with parent
  useEffect(() => {
    if (!renderControls) return;

    renderControls(
      <>
        <span className="text-xs text-muted-foreground">
          {useOnlineViewer ? "Microsoft" : "Google"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setUseOnlineViewer(!useOnlineViewer)}
          title="Switch viewer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </>
    );
  }, [renderControls, useOnlineViewer]);

  return (
    <div className="flex flex-col h-full">
      {/* Viewer info banner */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/30 border-b text-xs">
        <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-800 dark:text-amber-200">
          Online viewers require the document to be publicly accessible. If preview fails, download instead.
        </span>
      </div>

      {/* Document iframe */}
      <div className="flex-1 bg-muted/20">
        <iframe
          src={useOnlineViewer ? officeViewerUrl : googleViewerUrl}
          className="w-full h-full border-0"
          title={file.filename}
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      </div>
    </div>
  );
}
