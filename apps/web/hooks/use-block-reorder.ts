"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";

interface Block {
  _id: string;
  order: number;
}

interface UseBlockReorderOptions {
  pageId: string;
  blocks: Block[];
}

export function useBlockReorder({ pageId, blocks }: UseBlockReorderOptions) {
  const reorderMutation = useMutation(api.blocks.mutations.reorder);

  // Optimistic state - tracks the current order locally
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);

  // Track previous server order to detect real changes (not just array reference changes)
  const prevServerOrderRef = useRef<string>("");

  // Reset optimistic state when server data ACTUALLY changes (not just reference)
  useEffect(() => {
    // Create a stable key from the server order
    const serverOrderKey = blocks.map((b) => `${b._id}:${b.order}`).join(",");

    if (serverOrderKey !== prevServerOrderRef.current) {
      prevServerOrderRef.current = serverOrderKey;
      setOptimisticOrder(null);
    }
  }, [blocks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || active.id === over.id) {
        return;
      }

      // Use optimistic order if we have one, otherwise use server order
      const currentIds = optimisticOrder ?? blocks.map((b) => b._id);

      const oldIndex = currentIds.findIndex((id) => id === active.id);
      const newIndex = currentIds.findIndex((id) => id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return;
      }

      // Calculate new order optimistically
      const reorderedIds = arrayMove(currentIds, oldIndex, newIndex);

      // Update optimistic state immediately for smooth UI
      setOptimisticOrder(reorderedIds);

      // Fire mutation (Convex will update, then our useEffect resets optimisticOrder)
      await reorderMutation({
        pageId: pageId as Id<"pages">,
        blockIds: reorderedIds as Id<"blocks">[],
      });
    },
    [blocks, pageId, reorderMutation, optimisticOrder]
  );

  // Return optimistic order if available, otherwise server order
  const blockIds = optimisticOrder ?? blocks.map((b) => b._id);

  return {
    handleDragEnd,
    blockIds,
  };
}
