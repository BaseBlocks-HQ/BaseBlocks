"use client";

import { BlockRendererWrapper } from "@/components/blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { getSectionGridStyle, SPACER_SECTION_HEIGHTS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import type {
  BlockContent,
  BlockType,
  SectionLayout,
  SectionSettings,
  SpacerSectionHeight,
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
  const sectionsData = useQuery(api.sections.queries.list, {
    pageId: pageId as Id<"pages">,
  });

  if (pageData === undefined || sectionsData === undefined) {
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

  type SectionDoc = Doc<"sections">;
  type SlotDoc = SectionDoc["slots"][number];
  type BlockDoc = SlotDoc["blocks"][number];

  // Separate main sections from sidebar sections
  const mainSections = sectionsData.filter(
    (section: SectionDoc) => section.type !== "vertical"
  );
  const sidebarSections = sectionsData.filter(
    (section: SectionDoc) => section.type === "vertical"
  );
  const hasSidebar = sidebarSections.length > 0;

  // Render a single section
  const renderSection = (section: SectionDoc) => {
    // Handle spacer sections
    if (section.type === "spacer") {
      const settings = section.settings as SectionSettings;
      const height: SpacerSectionHeight = settings.spacerHeight ?? "medium";
      return (
        <div
          key={section._id}
          className={cn("w-full", SPACER_SECTION_HEIGHTS[height].value)}
          aria-hidden="true"
        />
      );
    }

    const gridStyle = getSectionGridStyle(
      section.type as SectionLayout,
      section.settings as SectionSettings
    );

    return (
      <div key={section._id} style={gridStyle}>
        {section.slots.map((slot: SlotDoc) => (
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
            {mainSections.map((section: SectionDoc) => renderSection(section))}
          </div>

          {/* Sidebar */}
          <aside className="w-72 flex-shrink-0 space-y-6">
            {sidebarSections.map((section: SectionDoc) =>
              renderSection(section)
            )}
          </aside>
        </div>
      ) : (
        // Standard layout without sidebar
        <div className="space-y-8">
          {mainSections.map((section: SectionDoc) => renderSection(section))}
        </div>
      )}
    </article>
  );
}
