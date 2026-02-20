"use client";

import { Button } from "@baseblocks/ui/button";
import { Download, ExternalLink, FileQuestion } from "lucide-react";
import type { ViewerProps } from "../types";
import { getFileExtension } from "../types";

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UnknownViewer({ file }: ViewerProps) {
  const extension = getFileExtension(file.filename);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = file.url;
    link.download = file.filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenExternal = () => {
    window.open(file.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center mb-6">
        <FileQuestion className="h-12 w-12 text-muted-foreground" />
      </div>

      <h3 className="text-lg font-medium mb-2">{file.filename}</h3>

      <p className="text-sm text-muted-foreground mb-1">{file.contentType}</p>

      <p className="text-sm text-muted-foreground mb-6">
        {formatFileSize(file.size)}
        {extension && ` • .${extension}`}
      </p>

      <p className="text-sm text-muted-foreground max-w-md mb-8">
        This file type cannot be previewed in the browser.
        {file.allowDownload !== false &&
          " Download it to view with a compatible application."}
      </p>

      <div className="flex items-center gap-3">
        {file.allowDownload !== false && (
          <Button onClick={handleDownload} size="lg">
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        )}
        <Button variant="outline" onClick={handleOpenExternal} size="lg">
          <ExternalLink className="h-4 w-4 mr-2" />
          Open in browser
        </Button>
      </div>
    </div>
  );
}
