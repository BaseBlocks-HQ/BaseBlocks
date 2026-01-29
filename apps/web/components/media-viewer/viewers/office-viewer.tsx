"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useState } from "react";
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
export function OfficeViewer({ file }: ViewerProps) {
  const [useOnlineViewer, setUseOnlineViewer] = useState(true);

  // Microsoft Office Online viewer URL
  // This works for publicly accessible documents
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.url)}`;

  // Google Docs viewer as fallback
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(file.url)}&embedded=true`;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {useOnlineViewer ? "Microsoft Office Viewer" : "Google Docs Viewer"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseOnlineViewer(!useOnlineViewer)}
          >
            Switch viewer
          </Button>
        </div>
      </div>

      {/* Viewer info banner */}
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b text-sm">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <span className="text-amber-800 dark:text-amber-200">
          Online viewers require the document to be publicly accessible. If
          preview fails, download the file instead.
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
