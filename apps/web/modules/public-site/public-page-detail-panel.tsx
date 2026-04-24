"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { ViewerToolbarIconButton } from "@/modules/media-viewer/components/viewer-toolbar-icon-button";
import { PageExportMenu } from "@/modules/page-export/components/page-export-menu";
import { DetailPanelFrame } from "@/modules/shared/components/detail-panel-frame";
import { DetailPanelHeaderChrome } from "@/modules/shared/components/detail-panel-header-chrome";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { Maximize2, Minimize2, X } from "lucide-react";
import { PublicContent } from "./public-content";
import { usePublicPagePanel } from "./public-page-panel-context";

interface PublicPageDetailPanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export function PublicPageDetailPanel({
  isFullscreen,
  onToggleFullscreen,
}: PublicPageDetailPanelProps) {
  const { closePage, viewingPage } = usePublicPagePanel();
  const sessionTokens = getStoredAccessSessionTokens();
  const page = useQuery(
    api.pages.queries.get,
    viewingPage?.pageId
      ? { pageId: viewingPage.pageId as Id<"pages">, sessionTokens }
      : "skip",
  );

  if (!viewingPage) {
    return null;
  }

  return (
    <DetailPanelFrame
      bodyClassName="px-3 pb-3 pt-14 md:px-4 md:pb-4"
      headerOverlay
      header={
        <DetailPanelHeaderChrome>
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-medium leading-tight">
                {page?.title ?? "Loading..."}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <PageExportMenu
                align="end"
                mode="published"
                pageId={viewingPage.pageId}
              />
              {onToggleFullscreen ? (
                <ViewerToolbarIconButton
                  onClick={onToggleFullscreen}
                  label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  pressed={isFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </ViewerToolbarIconButton>
              ) : null}
              <ViewerToolbarIconButton onClick={closePage} label="Close panel">
                <X className="h-4 w-4" />
              </ViewerToolbarIconButton>
            </div>
          </div>
        </DetailPanelHeaderChrome>
      }
    >
      <PublicContent
        nested
        pageId={viewingPage.pageId}
        searchTerm={viewingPage.searchTerm}
      />
    </DetailPanelFrame>
  );
}
