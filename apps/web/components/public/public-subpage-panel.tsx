"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePublicSubpageContext } from "./public-subpage-context";
import { PublicSubpageBlockViewer } from "./public-subpage-block-viewer";
import type { Block } from "@blocknote/core";
import { useMemo } from "react";

export function PublicSubpagePanel() {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();

  // Generate a stable key for the viewer to force remount when content changes
  const viewerKey = useMemo(() => {
    if (!viewingSubpage) return "";
    const { content } = viewingSubpage;
    // Use title and content length as a simple key
    return `${content.title || ""}-${Array.isArray(content.content) ? content.content.length : 0}-${Date.now()}`;
  }, [viewingSubpage]);

  if (!viewingSubpage) return null;

  const { content } = viewingSubpage;

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-semibold text-lg truncate">
            {content.title || "Untitled"}
          </h2>
          {content.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {content.description}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={closeSubpage} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 min-w-0">
        <PublicSubpageBlockViewer key={viewerKey} content={content.content as Block[] | undefined} />
      </div>
    </div>
  );
}
