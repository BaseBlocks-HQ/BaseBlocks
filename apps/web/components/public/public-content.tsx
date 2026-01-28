"use client";

import { useQuery } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockRendererWrapper } from "@/components/blocks";

interface PublicContentProps {
  pageId: string;
}

export function PublicContent({ pageId }: PublicContentProps) {
  const pageWithBlocks = useQuery(api.pages.queries.getWithBlocks, {
    pageId: pageId as Id<"pages">,
  });

  if (pageWithBlocks === undefined) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-10 w-64 mb-8" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (pageWithBlocks === null) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Page not found</p>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">{pageWithBlocks.page.title}</h1>
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        {pageWithBlocks.blocks.map((block) => (
          <BlockRendererWrapper
            key={block._id}
            block={{
              _id: block._id,
              type: block.type,
              content: block.content,
            }}
          />
        ))}
      </div>
    </article>
  );
}
