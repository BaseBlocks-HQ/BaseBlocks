"use client";

import { Button } from "@baseblocks/ui/button";
import { AlertCircle, Download, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ViewerProps } from "../types";

/**
 * Office document viewer using Microsoft Office Online Viewer
 *
 * Note: This uses Microsoft's public document viewer which requires the document
 * to be publicly accessible via URL. The download proxy at /api/storage/download
 * is public and accessible without authentication.
 *
 * IMPORTANT: This does NOT work on localhost - Microsoft's servers need to fetch
 * the document from a public URL on the internet.
 */
export function OfficeViewer({ file, renderControls }: ViewerProps) {
  const [useOnlineViewer, setUseOnlineViewer] = useState(true);

  // Check if running on localhost (online viewers won't work)
  const isLocalhost = useMemo(() => {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname;
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.")
    );
  }, []);

  // Convert relative URL to absolute public URL for external viewers
  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return file.url;
    // If already absolute, use as-is
    if (file.url.startsWith("http://") || file.url.startsWith("https://")) {
      return file.url;
    }
    // Convert relative URL to absolute
    return `${window.location.origin}${file.url}`;
  }, [file.url]);

  // Microsoft Office Online viewer URL
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;

  // Google Docs viewer as fallback
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(publicUrl)}&embedded=true`;

  // Register controls with parent
  useEffect(() => {
    if (!renderControls) return;

    if (isLocalhost) {
      renderControls(
        <span className="text-xs text-muted-foreground">Local preview</span>,
      );
      return;
    }

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
      </>,
    );
  }, [renderControls, useOnlineViewer, isLocalhost]);

  // Show download prompt on localhost
  if (isLocalhost) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="font-medium">Office Preview Unavailable Locally</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Microsoft Office and Google Docs viewers require a publicly
            accessible URL. Preview will work in production.
          </p>
        </div>
        <Button asChild>
          <a href={file.url} download={file.filename}>
            <Download className="h-4 w-4 mr-2" />
            Download {file.filename}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Viewer info banner */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 border-b text-xs">
        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-muted-foreground">
          Using {useOnlineViewer ? "Microsoft Office" : "Google Docs"} viewer.
          If preview fails, try switching viewers or download the file.
        </span>
      </div>

      {/* Document iframe */}
      <div className="flex-1 bg-muted/20">
        <iframe
          src={useOnlineViewer ? officeViewerUrl : googleViewerUrl}
          className="w-full h-full border-0"
          title={file.filename}
          sandbox="allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation allow-forms"
        />
      </div>
    </div>
  );
}
