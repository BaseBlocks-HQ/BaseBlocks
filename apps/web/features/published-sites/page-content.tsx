"use client";

import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { openEditorExtensions } from "@/features/openeditor/extensions";
import { baseBlocksOpenEditorTheme } from "@/features/openeditor/openeditor-theme";
import { OpenEditorTabbedPage } from "@/features/openeditor/page-tabs";
import { readOpenEditorPageTabs } from "@/features/openeditor/page-tabs-model";
import { PublicPagePanel } from "@/features/published-sites/page-panel";
import { usePagePanelState } from "@/components/site-runtime/page-panel-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { Spinner } from "@baseblocks/ui/spinner";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { useQuery } from "convex/react";
import type { OpenEditorDocument } from "@openeditor/core";
import {
  OpenEditorViewer,
  type OpenEditorPageRuntime,
} from "@openeditor/react";
import { OpenEditorThemeProvider } from "@openeditor/ui";
import "@openeditor/ui/styles.css";
import { useEffect, useMemo, useState } from "react";

type ResolvedPageContent = { document: OpenEditorDocument };

interface PublicPageContentProps {
  pageId: string;
  initialPage?: { title: string };
  initialStructure?: ResolvedPageContent;
  pageTitles?: ReadonlyMap<string, string>;
  nested?: boolean;
}

const publicPagePanelSurfaceClassName =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_18px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-xl";

const hiddenSplitHandleClassName =
  "relative z-20 -mr-1 !w-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 after:absolute after:inset-y-0 after:left-1/2 after:block after:w-3 after:-translate-x-1/2 after:bg-transparent";

export function PublicPageContent({
  pageId,
  initialPage,
  initialStructure,
  nested,
  pageTitles = new Map(),
}: PublicPageContentProps) {
  const { viewingPage, closePage } = usePagePanelState();
  const showPagePanel = !nested && !!viewingPage;
  const sessionTokens = getStoredAccessSessionTokens();
  const queriedPage = useQuery(
    api.pages.get,
    initialPage ? "skip" : { pageId: pageId as Id<"pages">, sessionTokens },
  );
  const queriedStructure = useQuery(
    api.pageContent.getPublished,
    initialStructure
      ? "skip"
      : { pageId: pageId as Id<"pages">, sessionTokens },
  );
  const page = initialPage ?? queriedPage;
  const structure = initialStructure ?? queriedStructure;
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const actions = useSiteRenderActions();
  const openEditorDocument = structure?.document;
  const pageRuntime = useMemo<OpenEditorPageRuntime>(
    () => ({
      resolvePage: async (targetPageId) => ({
        pageId: targetPageId,
        title: pageTitles.get(targetPageId) ?? "Untitled",
      }),
      openPage: ({ pageId: targetPageId }) => actions.openPage?.(targetPageId),
    }),
    [actions, pageTitles],
  );

  useEffect(() => {
    if (!viewingPage) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePage();
        setIsFullscreen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closePage, viewingPage]);

  if (page === undefined || structure === undefined) {
    return (
      <div className="flex min-h-48 items-center justify-center p-8">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }
  if (!page) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center text-muted-foreground">
        Page not found
      </div>
    );
  }

  const mainContent = (
    <div className="h-full min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
      <article className="mx-auto max-w-4xl px-4 py-8 md:px-8">
        <h1 className="mb-8 text-3xl font-bold">{page.title}</h1>
        {openEditorDocument ? (
          <OpenEditorThemeProvider
            className="contents"
            theme={baseBlocksOpenEditorTheme}
          >
            {readOpenEditorPageTabs(openEditorDocument) ? (
              <OpenEditorTabbedPage
                document={openEditorDocument}
                editable={false}
                extensions={openEditorExtensions}
                pageRuntime={pageRuntime}
              />
            ) : (
              <OpenEditorViewer
                className="oe-viewer"
                document={openEditorDocument}
                extensions={openEditorExtensions}
                pageRuntime={pageRuntime}
              />
            )}
          </OpenEditorThemeProvider>
        ) : null}
      </article>
    </div>
  );

  if (!showPagePanel) return mainContent;

  const pagePanel = (
    <PublicPagePanel
      isFullscreen={isFullscreen}
      onToggleFullscreen={() => setIsFullscreen((value) => !value)}
    />
  );

  if (isFullscreen || isMobile) {
    return (
      <div className="h-full min-h-0 min-w-0 p-2 md:p-3 lg:p-4">
        <section className={publicPagePanelSurfaceClassName}>
          {pagePanel}
        </section>
      </div>
    );
  }

  return (
    <ResizablePanelGroup
      className="h-full min-h-0 min-w-0"
      orientation="horizontal"
    >
      <ResizablePanel defaultSize={60} minSize={30}>
        <div className="h-full min-h-0 min-w-0 overflow-hidden pr-2">
          {mainContent}
        </div>
      </ResizablePanel>
      <ResizableHandle className={hiddenSplitHandleClassName} />
      <ResizablePanel defaultSize={40} minSize={30}>
        <div className="h-full min-h-0 min-w-0 p-2 md:p-3 lg:p-4">
          <section className={publicPagePanelSurfaceClassName}>
            {pagePanel}
          </section>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
