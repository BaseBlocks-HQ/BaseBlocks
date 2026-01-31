"use client";

import { BlockRendererWrapper } from "@/components/blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { getLayoutGridStyle, SPACER_LAYOUT_HEIGHTS } from "@/lib/layouts";
import { cn } from "@/lib/utils";
import type {
  BlockContent,
  BlockType,
  LayoutType,
  LayoutSettings,
  SpacerLayoutHeight,
} from "@/types";
import { api } from "@repo/backend";
import type { Doc, Id } from "@repo/backend";
import { useQuery } from "convex/react";

interface PublicContentProps {
  pageId: string;
}

export function PublicContent({ pageId }: PublicContentProps) {
  const pageData = useQuery(api.pages.queries.get, {
    pageId: pageId as Id<"pages">,
  });
  const layoutsData = useQuery(api.layouts.queries.list, {
    pageId: pageId as Id<"pages">,
  });

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
    (layout: LayoutDoc) => layout.type !== "vertical"
  );
  const sidebarLayouts = layoutsData.filter(
    (layout: LayoutDoc) => layout.type === "vertical"
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
          className={cn("w-full", SPACER_LAYOUT_HEIGHTS[height].value)}
          aria-hidden="true"
        />
      );
    }

    const gridStyle = getLayoutGridStyle(
      layout.type as LayoutType,
      layout.settings as LayoutSettings
    );

    return (
      <div key={layout._id} style={gridStyle}>
        {layout.slots.map((slot: SlotDoc) => (
          <div
            key={slot.id}
            className="prose prose-neutral dark:prose-invert max-w-none"
          >
            {slot.blocks.map((block: BlockDoc, index: number) => (
              <div
                key={block.id}
                className={cn(index < slot.blocks.length - 1 && "mb-3")}
              >
                <BlockRendererWrapper
                  block={{
                    _id: block.id,
                    type: block.type as BlockType,
                    content: block.content as BlockContent,
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
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
            {sidebarLayouts.map((layout: LayoutDoc) =>
              renderLayout(layout)
            )}
          </aside>
        </div>
      ) : (
        // Standard layout without sidebar
        <div className="space-y-8">
          {mainLayouts.map((layout: LayoutDoc) => renderLayout(layout))}
        </div>
      )}
    </article>
  );
}
