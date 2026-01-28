"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockEditorWrapper } from "@/components/blocks";
import { SaveIndicator } from "./save-indicator";
import { useSaveStatus } from "@/hooks";

interface PageEditorProps {
  pageId: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
  const pageData = useQuery(api.pages.queries.getWithBlocks, {
    pageId: pageId as Id<"pages">,
  });
  const updateBlock = useMutation(api.blocks.mutations.update);
  const removeBlock = useMutation(api.blocks.mutations.remove);
  const { status, setStatus } = useSaveStatus();

  if (pageData === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  const { page, blocks } = pageData;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <SaveIndicator status={status} />
      </div>

      <div className="space-y-4">
        {blocks.map((block) => (
          <BlockEditorWrapper
            key={block._id}
            block={{
              _id: block._id,
              type: block.type,
              content: block.content,
            }}
            onUpdate={(content) =>
              updateBlock({ blockId: block._id as Id<"blocks">, content })
            }
            onRemove={() => removeBlock({ blockId: block._id as Id<"blocks"> })}
            onSaveStatusChange={setStatus}
          />
        ))}

        {blocks.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            Add components from the sidebar to get started
          </p>
        )}
      </div>
    </div>
  );
}
