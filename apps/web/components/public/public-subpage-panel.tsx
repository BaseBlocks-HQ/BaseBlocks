"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { usePublicSubpageContext } from "./public-subpage-context";
import { PublicSubpageBlockViewer } from "./public-subpage-block-viewer";
import type { Block } from "@blocknote/core";

export function PublicSubpagePanel() {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();

  if (!viewingSubpage) return null;

  const { content } = viewingSubpage;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg truncate">
            {content.title || "Untitled"}
          </h2>
          {content.description && (
            <p className="text-sm text-muted-foreground truncate">
              {content.description}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={closeSubpage} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <PublicSubpageBlockViewer content={content.content as Block[] | undefined} />
      </div>
    </div>
  );
}
