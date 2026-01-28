"use client";

import { useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Skeleton } from "@/components/ui/skeleton";
import { BlockEditorWrapper } from "@/components/blocks";
import { SortableBlock } from "@/components/blocks/editor/sortable-block";
import { DndProvider } from "@/components/dnd";
import { SaveIndicator } from "./save-indicator";
import { useSaveStatus, useBlockReorder } from "@/hooks";
import { GripVertical } from "lucide-react";

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

  // Get blocks for reordering - use empty array while loading
  const blocks = pageData?.blocks ?? [];
  const { handleDragEnd, blockIds } = useBlockReorder({
    pageId,
    blocks: blocks.map((b) => ({ _id: b._id, order: b.order })),
  });

  // Create a map for quick block lookup
  const blockMap = useMemo(() => {
    const map = new Map<string, (typeof blocks)[0]>();
    for (const block of blocks) {
      map.set(block._id, block);
    }
    return map;
  }, [blocks]);

  // Sort blocks by the optimistic order from blockIds
  const sortedBlocks = useMemo(() => {
    return blockIds
      .map((id) => blockMap.get(id))
      .filter((b): b is (typeof blocks)[0] => b !== undefined);
  }, [blockIds, blockMap]);

  // Render drag overlay content
  const renderDragOverlay = (activeId: string | number) => {
    const block = blockMap.get(String(activeId));
    if (!block) return null;

    return (
      <div className="bg-background border rounded-lg shadow-lg p-4 opacity-95 max-w-3xl">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center h-6 w-6 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-muted-foreground mb-1">
              {block.type.charAt(0).toUpperCase() + block.type.slice(1)}
            </div>
            <div className="text-sm truncate">
              {getBlockPreview(block)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (pageData === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  const { page } = pageData;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">{page.title}</h1>
        <SaveIndicator status={status} />
      </div>

      <div className="space-y-4">
        {sortedBlocks.length > 0 ? (
          <DndProvider
            items={blockIds}
            onDragEnd={handleDragEnd}
            renderDragOverlay={renderDragOverlay}
          >
            {sortedBlocks.map((block) => (
              <SortableBlock
                key={block._id}
                id={block._id}
                onRemove={() =>
                  removeBlock({ blockId: block._id as Id<"blocks"> })
                }
              >
                <BlockEditorWrapper
                  block={{
                    _id: block._id,
                    type: block.type,
                    content: block.content,
                  }}
                  onUpdate={(content) =>
                    updateBlock({ blockId: block._id as Id<"blocks">, content })
                  }
                  onSaveStatusChange={setStatus}
                />
              </SortableBlock>
            ))}
          </DndProvider>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Add components from the sidebar to get started
          </p>
        )}
      </div>
    </div>
  );
}

// Helper to get a text preview of block content
function getBlockPreview(block: { type: string; content: unknown }): string {
  const content = block.content as Record<string, unknown> | null;
  if (!content) return "Empty block";

  switch (block.type) {
    case "paragraph":
    case "heading":
    case "callout":
      return typeof content.text === "string"
        ? content.text.slice(0, 100) || "Empty"
        : "Empty";
    case "code":
      return typeof content.code === "string"
        ? content.code.slice(0, 100) || "Code block"
        : "Code block";
    case "divider":
      return "Divider";
    case "image":
      return "Image";
    case "document-library":
      return "Document Library";
    case "search":
      return "Search";
    default:
      return block.type;
  }
}
