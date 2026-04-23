"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { PageExportMenu } from "@/modules/page-export/components/page-export-menu";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { useQuery } from "convex/react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { PublicContent } from "./public-content";
import { usePublicPagePanel } from "./public-page-panel-context";

interface PublicPagePanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function PublicPagePanel({
  isFullscreen,
  onToggleFullscreen,
}: PublicPagePanelProps) {
  const { viewingPage, closePage } = usePublicPagePanel();
  const sessionTokens = getStoredAccessSessionTokens();

  const page = useQuery(
    api.pages.queries.get,
    viewingPage?.pageId
      ? { pageId: viewingPage.pageId as Id<"pages">, sessionTokens }
      : "skip",
  );

  if (!viewingPage) return null;

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
          <PageExportMenu pageId={viewingPage.pageId} mode="published" />
          {onToggleFullscreen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={closePage}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Full page content for the referenced page */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <PublicContent
          pageId={viewingPage.pageId}
          nested
          searchTerm={viewingPage.searchTerm}
        />
      </div>
    </div>
  );
}
