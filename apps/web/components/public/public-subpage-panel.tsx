"use client";

import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { usePublicSubpageContext } from "./public-subpage-context";
import { PublicSubpageBlockViewer } from "./public-subpage-block-viewer";
import type { Block } from "@blocknote/core";
import { useMemo } from "react";

interface PublicSubpagePanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function PublicSubpagePanel({ isFullscreen, onToggleFullscreen }: PublicSubpagePanelProps) {
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
    <div className="h-full min-w-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-semibold text-lg break-words">
            {content.title || "Untitled"}
          </h2>
          {content.description && (
            <p className="text-sm text-muted-foreground break-words">
              {content.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFullscreen && (
            <Button variant="ghost" size="icon" onClick={onToggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={closeSubpage}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6">
        <PublicSubpageBlockViewer key={viewerKey} content={content.content as Block[] | undefined} />
      </div>
    </div>
  );
}
