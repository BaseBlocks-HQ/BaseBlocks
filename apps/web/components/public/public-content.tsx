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
import { Skeleton } from "@/components/ui/skeleton";
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
  PublicSubpageProvider,
  usePublicSubpageContext,
} from "./public-subpage-context";
import { PublicSubpagePanel } from "./public-subpage-panel";

interface PublicContentProps {
  pageId: string;
}

function PublicContentInner({ pageId }: PublicContentProps) {
  const { viewingSubpage, closeSubpage } = usePublicSubpageContext();
  const pageData = useQuery(api.pages.queries.get, {
    pageId: pageId as Id<"pages">,
  });
  const layoutsData = useQuery(api.layouts.queries.listPublished, {
    pageId: pageId as Id<"pages">,
  });

  // Fullscreen state for subpage panel
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
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

  // Separate main layouts from sidebar layouts
  const mainLayouts = layoutsData.filter(
    (layout: LayoutDoc) => layout.type !== "vertical",
  );
  const sidebarLayouts = layoutsData.filter(
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
    <div className="p-8">
      <article className={cn("mx-auto", hasSidebar ? "max-w-6xl" : "max-w-4xl")}>
        <h1 className="text-3xl font-bold mb-8">{pageData.title}</h1>

        {hasSidebar ? (
          // Layout with sidebar
          <div className="flex gap-8">
            {/* Main content */}
            <div className="flex-1 min-w-0 space-y-8">
              {mainLayouts.map((layout: LayoutDoc) => renderLayout(layout))}
            </div>

            {/* Sidebar */}
            <aside className="w-72 flex-shrink-0 space-y-6">
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
  if (viewingSubpage) {
    return (
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Main content area */}
          {!isFullscreen && (
            <>
              <ResizablePanel defaultSize={60} minSize={20}>
                <div className="h-full w-full min-w-0 overflow-y-auto overflow-x-hidden">
                  {renderMainContent()}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}
          {/* Subpage panel */}
          <ResizablePanel defaultSize={isFullscreen ? 100 : 40} minSize={20}>
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

export function PublicContent({ pageId }: PublicContentProps) {
  return (
    <PublicSubpageProvider>
      <PublicContentInner pageId={pageId} />
    </PublicSubpageProvider>
  );
}
