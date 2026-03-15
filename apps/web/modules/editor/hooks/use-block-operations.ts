"use client";

import { useBlockClipboard } from "@/modules/editor/contexts/block-clipboard-context";
import {
  canPasteCopiedBlock,
  createPastedBlock,
} from "@/modules/editor/lib/block-clipboard";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import type { EditorMutations } from "@/modules/shared/contexts/editor-mutations";
import type { AnyContent, LayoutData } from "@baseblocks/types";
import { type MutableRefObject, useRef } from "react";
import { toast } from "sonner";

interface UseBlockOperationsArgs {
  pageId: string;
  allLayouts: LayoutData[];
  onSelectionChange?: (slotId: string | null) => void;
  layoutsData?: {
    _id: string;
    slots: { id: string; blocks: { id: string; content: unknown }[] }[];
  }[];
  layoutMutations: EditorMutations["layouts"];
}

export function useBlockOperations({
  pageId,
  allLayouts,
  onSelectionChange,
  layoutsData,
  layoutMutations,
}: UseBlockOperationsArgs) {
  const { selectBlock, pushCommand, isUndoRedoExecuting } = useEditorContext();
  const { copiedBlock } = useBlockClipboard();

  const lastKnownContentRef: MutableRefObject<Map<string, AnyContent>> = useRef(
    new Map(),
  );

  if (layoutsData) {
    const map = new Map<string, AnyContent>();
    for (const layout of layoutsData) {
      for (const slot of layout.slots) {
        for (const block of slot.blocks) {
          map.set(
            `${layout._id}:${slot.id}:${block.id}`,
            structuredClone(block.content) as AnyContent,
          );
        }
      }
    }
    lastKnownContentRef.current = map;
  }

  const handleUpdateBlock = async (
    layoutId: string,
    slotId: string,
    blockId: string,
    content: AnyContent,
  ) => {
    const key = `${layoutId}:${slotId}:${blockId}`;
    const previousContent = lastKnownContentRef.current.get(key);

    await layoutMutations.updateBlockInSlot({
      layoutId,
      slotId,
      blockId,
      content,
    });

    lastKnownContentRef.current.set(key, structuredClone(content));

    if (!isUndoRedoExecuting && previousContent) {
      const oldContent = structuredClone(previousContent);
      const newContent = structuredClone(content);
      pushCommand({
        description: "Update block content",
        pageId,
        undo: async () => {
          await layoutMutations.updateBlockInSlot({
            layoutId,
            slotId,
            blockId,
            content: oldContent,
          });
          lastKnownContentRef.current.set(key, structuredClone(oldContent));
        },
        redo: async () => {
          await layoutMutations.updateBlockInSlot({
            layoutId,
            slotId,
            blockId,
            content: newContent,
          });
          lastKnownContentRef.current.set(key, structuredClone(newContent));
        },
      });
    }
  };

  const handleRemoveBlock = async (
    layoutId: string,
    slotId: string,
    blockId: string,
  ) => {
    const layout = allLayouts.find((l) => l.id === layoutId);
    const slot = layout?.slots.find((s) => s.id === slotId);
    const blockIndex = slot?.blocks.findIndex((b) => b.id === blockId) ?? -1;
    const block = slot?.blocks[blockIndex];

    await layoutMutations.removeBlockFromSlot({ layoutId, slotId, blockId });

    if (!isUndoRedoExecuting && block) {
      const snapshot = structuredClone(block);
      pushCommand({
        description: "Remove block",
        pageId,
        undo: async () => {
          await layoutMutations.addBlockToSlot({
            layoutId,
            slotId,
            block: {
              id: snapshot.id,
              type: snapshot.type,
              content: snapshot.content,
            },
            index: blockIndex >= 0 ? blockIndex : undefined,
          });
        },
        redo: async () => {
          await layoutMutations.removeBlockFromSlot({
            layoutId,
            slotId,
            blockId: snapshot.id,
          });
        },
      });
    }
  };

  const handleMoveBlock = async (
    layoutId: string,
    fromSlotId: string,
    toSlotId: string,
    blockId: string,
    toIndex: number,
  ) => {
    const layout = allLayouts.find((l) => l.id === layoutId);
    const fromSlot = layout?.slots.find((s) => s.id === fromSlotId);
    const originalIndex =
      fromSlot?.blocks.findIndex((b) => b.id === blockId) ?? 0;

    await layoutMutations.moveBlock({
      layoutId,
      fromSlotId,
      toSlotId,
      blockId,
      toIndex,
    });

    if (!isUndoRedoExecuting) {
      pushCommand({
        description: "Move block",
        pageId,
        undo: async () => {
          await layoutMutations.moveBlock({
            layoutId,
            fromSlotId: toSlotId,
            toSlotId: fromSlotId,
            blockId,
            toIndex: originalIndex,
          });
        },
        redo: async () => {
          await layoutMutations.moveBlock({
            layoutId,
            fromSlotId,
            toSlotId,
            blockId,
            toIndex,
          });
        },
      });
    }
  };

  const handlePasteBlock = async (layoutId: string, slotId: string) => {
    if (!canPasteCopiedBlock(copiedBlock)) {
      return;
    }

    const newBlock = createPastedBlock(copiedBlock);

    try {
      await layoutMutations.addBlockToSlot({
        layoutId,
        slotId,
        block: newBlock,
      });

      lastKnownContentRef.current.set(
        `${layoutId}:${slotId}:${newBlock.id}`,
        structuredClone(newBlock.content),
      );
      selectBlock(layoutId, slotId, newBlock.id);
      onSelectionChange?.(slotId);

      if (!isUndoRedoExecuting) {
        const snapshot = structuredClone(newBlock);
        pushCommand({
          description: "Paste block",
          pageId,
          undo: async () => {
            await layoutMutations.removeBlockFromSlot({
              layoutId,
              slotId,
              blockId: snapshot.id,
            });
          },
          redo: async () => {
            await layoutMutations.addBlockToSlot({
              layoutId,
              slotId,
              block: {
                id: snapshot.id,
                type: snapshot.type,
                content: structuredClone(snapshot.content),
              },
            });
            lastKnownContentRef.current.set(
              `${layoutId}:${slotId}:${snapshot.id}`,
              structuredClone(snapshot.content),
            );
          },
        });
      }
    } catch (_error) {
      toast.error("Failed to paste block");
    }
  };

  return {
    handleUpdateBlock,
    handleRemoveBlock,
    handleMoveBlock,
    handlePasteBlock,
  };
}
