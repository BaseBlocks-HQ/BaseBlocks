import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import type { BlockType, BlockContent, PageId } from "@/types";
import { DEFAULT_BLOCK_CONTENT } from "@/types";

/**
 * Hook providing block CRUD operations
 */
export function useBlockOperations() {
  const createBlock = useMutation(api.blocks.mutations.create);
  const updateBlock = useMutation(api.blocks.mutations.update);
  const removeBlock = useMutation(api.blocks.mutations.remove);

  const addBlock = useCallback(
    async (pageId: string, type: BlockType) => {
      const content = DEFAULT_BLOCK_CONTENT[type];
      return createBlock({
        pageId: pageId as Id<"pages">,
        type,
        content,
      });
    },
    [createBlock],
  );

  const editBlock = useCallback(
    async (blockId: string, content: BlockContent) => {
      return updateBlock({
        blockId: blockId as Id<"blocks">,
        content,
      });
    },
    [updateBlock],
  );

  const deleteBlock = useCallback(
    async (blockId: string) => {
      return removeBlock({
        blockId: blockId as Id<"blocks">,
      });
    },
    [removeBlock],
  );

  return {
    addBlock,
    editBlock,
    deleteBlock,
  };
}
