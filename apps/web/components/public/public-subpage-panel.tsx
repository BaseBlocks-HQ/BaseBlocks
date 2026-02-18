"use client";

import { Button } from "@/components/ui/button";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { usePublicSubpageContext } from "./public-subpage-context";
import { PublicContent } from "./public-content";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";

interface PublicSubpagePanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function PublicSubpagePanel({ isFullscreen, onToggleFullscreen }: PublicSubpagePanelProps) {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();

  const page = useQuery(
    api.pages.queries.get,
    viewingSubpage?.pageId ? { pageId: viewingSubpage.pageId as Id<"pages"> } : "skip",
  );

  if (!viewingSubpage) return null;

  return (
    <div className="h-full min-w-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex-1 min-w-0 pr-2">
          <h2 className="font-semibold text-lg break-words">
            {page?.title || "Loading..."}
          </h2>
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

      {/* Full page content for the subpage */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <PublicContent pageId={viewingSubpage.pageId} nested />
      </div>
    </div>
  );
}
