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
import type { Id } from "@repo/backend";
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

  return (
    <article className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">{pageData.title}</h1>
      <div className="space-y-8">
        {sectionsData.map((section) => {
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
            section.settings as SectionSettings,
          );

          return (
            <div key={section._id} style={gridStyle}>
              {section.slots.map((slot) => (
                <div
                  key={slot.id}
                  className="prose prose-neutral dark:prose-invert max-w-none"
                >
                  {slot.blocks.map((block, index) => (
                    <div
                      key={block.id}
                      className={cn(
                        index < slot.blocks.length - 1 && "mb-3"
                      )}
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
        })}
      </div>
    </article>
  );
}
