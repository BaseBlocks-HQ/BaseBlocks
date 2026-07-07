"use client";

import { BlurStack } from "@baseblocks/ui/blur-stack";
import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { ViewerToolbarIconButton } from "@/modules/editor/file-preview/components/viewer-toolbar-icon-button";
import { PageExportMenu } from "@/modules/editor/page-export/components/page-export-menu";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { Maximize2, Minimize2, X } from "lucide-react";
import type { ReactNode } from "react";
import { PublicContent } from "./public-content";
import { usePublicPagePanel } from "./public-page-panel-context";

interface PublicPageDetailPanelProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function PublicPagePanelFrame({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
        <div className="pointer-events-auto">{header}</div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="min-h-full px-3 pb-3 pt-14 md:px-4 md:pb-4">
          {children}
        </div>
      </ScrollArea>
    </div>
  );
}

function PublicPagePanelHeader({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate overflow-hidden">
      <BlurStack className="inset-x-0 top-0 h-14" direction="down" />
      <div className="absolute inset-0 bg-linear-to-b from-background/78 via-background/42 to-background/8 dark:from-background/86 dark:via-background/52 dark:to-background/12" />
      <div className="relative">{children}</div>
    </div>
  );
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
    <PublicPagePanelFrame
      header={
        <PublicPagePanelHeader>
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
        </PublicPagePanelHeader>
      }
    >
      <PublicContent
        nested
        pageId={viewingPage.pageId}
        searchTerm={viewingPage.searchTerm}
      />
    </PublicPagePanelFrame>
  );
}
