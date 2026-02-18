"use client";

import {
  ElementRendererWrapper,
  LayoutContextProvider,
} from "@/components/elements";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ContentSkeleton } from "@/components/skeletons";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SPACER_LAYOUT_HEIGHTS, getLayoutGridStyle } from "@/lib/layouts";
import { cn } from "@/lib/utils";
import type {
  AnyContent,
  ElementType,
  LayoutSettings,
  LayoutType,
  SpacerLayoutHeight,
} from "@/types";
import { api } from "@repo/backend";
import type { Doc, Id } from "@repo/backend";
import { useQuery } from "convex/react";
import { useState, useEffect } from "react";
import {
  usePublicSubpageContext,
} from "./public-subpage-context";
import { PublicSubpagePanel } from "./public-subpage-panel";

interface PublicContentProps {
  pageId: string;
  /** When true, subpage panel rendering is disabled to prevent infinite recursion */
  nested?: boolean;
}

function PublicContentInner({ pageId, nested }: PublicContentProps) {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();
  const showSubpagePanel = !nested && !!viewingSubpage;
  const pageData = useQuery(api.pages.queries.get, {
    pageId: pageId as Id<"pages">,
  });
  const layoutsData = useQuery(api.layouts.queries.listPublished, {
    pageId: pageId as Id<"pages">,
  });

  // Fullscreen state for subpage panel
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Page-level tabs
  const pageTabs = pageData?.pageTabs ?? [];
  const hasTabs = pageTabs.length > 0;
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Auto-select first tab
  useEffect(() => {
    if (hasTabs) {
      const tabExists = pageTabs.some((t) => t.id === activeTabId);
      if (!activeTabId || !tabExists) {
        const firstTab = pageTabs[0];
        if (firstTab) setActiveTabId(firstTab.id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [pageTabs, hasTabs, activeTabId]);

  // ESC key to close subpage panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && viewingSubpage) {
        closeSubpage();
        setIsFullscreen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [viewingSubpage, closeSubpage]);

  if (pageData === undefined || layoutsData === undefined) {
    return (
      <div className="p-8">
        <ContentSkeleton />
      </div>
    );
  }

  if (pageData === null) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  type LayoutDoc = Doc<"layouts">;
  type SlotDoc = LayoutDoc["slots"][number];
  type BlockDoc = SlotDoc["blocks"][number];

  // Filter layouts by active tab (if tabs exist)
  const filteredLayouts = hasTabs
    ? layoutsData.filter((layout: LayoutDoc) => layout.tabId === activeTabId)
    : layoutsData;

  // Separate main layouts from sidebar layouts
  const mainLayouts = filteredLayouts.filter(
    (layout: LayoutDoc) => layout.type !== "vertical",
  );
  const sidebarLayouts = filteredLayouts.filter(
    (layout: LayoutDoc) => layout.type === "vertical",
  );
  const hasSidebar = sidebarLayouts.length > 0;

  // Render a single layout
  const renderLayout = (layout: LayoutDoc) => {
    // Handle spacer layouts
    if (layout.type === "spacer") {
      const settings = layout.settings as LayoutSettings;
      const height: SpacerLayoutHeight = settings.spacerHeight ?? "medium";
      return (
        <div
          key={layout._id}
          style={{ height: `${SPACER_LAYOUT_HEIGHTS[height]}px` }}
          className="w-full"
          aria-hidden="true"
        />
      );
    }

    const gridStyle = getLayoutGridStyle(
      layout.type as LayoutType,
      layout.settings as LayoutSettings,
    );

    return (
      <div key={layout._id} style={gridStyle}>
        {layout.slots.map((slot: SlotDoc) => (
          <div
            key={slot.id}
            className="min-w-0"
          >
            {slot.blocks.map((block: BlockDoc, index: number) => (
              <div
                key={block.id}
                className={cn(
                  "prose prose-neutral dark:prose-invert max-w-none",
                  index < slot.blocks.length - 1 && "mb-3"
                )}
              >
                <LayoutContextProvider
                  layoutType={layout.type as LayoutType}
                  layoutId={layout._id}
                >
                  <ElementRendererWrapper
                    id={block.id}
                    type={block.type as ElementType}
                    content={block.content as AnyContent}
                  />
                </LayoutContextProvider>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Main content renderer
  const renderMainContent = () => (
    <div className="p-4 md:p-8">
      <article className={cn("mx-auto", hasSidebar ? "max-w-6xl" : "max-w-4xl")}>
        <h1 className="text-3xl font-bold mb-8">{pageData.title}</h1>

        {/* Page-level tab bar */}
        {hasTabs && (
          <div className="mb-8 flex justify-center">
            <Tabs
              value={activeTabId ?? undefined}
              onValueChange={setActiveTabId}
            >
              <TabsList>
                {pageTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="px-4">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        )}

        {hasSidebar ? (
          // Layout with sidebar
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-8">
              {mainLayouts.map((layout: LayoutDoc) => renderLayout(layout))}
            </div>

            {/* Sidebar */}
            <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
              {sidebarLayouts.map((layout: LayoutDoc) => renderLayout(layout))}
            </aside>
          </div>
        ) : (
          // Standard layout without sidebar
          <div className="space-y-8">
            {mainLayouts.map((layout: LayoutDoc) => renderLayout(layout))}
          </div>
        )}
      </article>
    </div>
  );

  // When viewing a subpage, use resizable panels with their own scroll
  if (showSubpagePanel) {
    return (
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Main content area */}
          {!isFullscreen && (
            <>
              <ResizablePanel defaultSize={58} minSize={30}>
                <div className="h-full w-full min-w-0 overflow-y-auto overflow-x-hidden">
                  {renderMainContent()}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          {/* Subpage panel */}
          <ResizablePanel defaultSize={isFullscreen ? 100 : 42} minSize={30}>
            <div className="h-full w-full min-w-0 overflow-hidden border-l">
              <PublicSubpagePanel
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  }

  // Normal view - no wrapper, parent handles scroll
  return renderMainContent();
}

export function PublicContent({ pageId, nested }: PublicContentProps) {
  return <PublicContentInner pageId={pageId} nested={nested} />;
}
