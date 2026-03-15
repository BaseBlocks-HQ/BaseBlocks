"use client";

import {
  canPasteCopiedBlock,
  createPastedBlock,
} from "@/modules/editor/lib/block-clipboard";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import { useEditorMutations } from "@/modules/shared/contexts/editor-mutations";
import { arrayMove } from "@/modules/shared/dnd";
import { createLayout } from "@/modules/shared/layouts";
import type {
  AnyContent,
  LayoutData,
  LayoutSettings,
  LayoutType,
} from "@baseblocks/types";
import { type MutableRefObject, useRef } from "react";
import { toast } from "sonner";

interface UseLayoutOperationsArgs {
  pageId: string;
  allLayouts: LayoutData[];
  mainLayoutIds: string[];
  sidebarLayoutIds: string[];
  activeTabId: string | null;
  onSelectionChange?: (slotId: string | null) => void;
  layoutsData?: {
    _id: string;
    slots: { id: string; blocks: { id: string; content: unknown }[] }[];
  }[];
}

export function useLayoutOperations({
  pageId,
  allLayouts,
  mainLayoutIds,
  sidebarLayoutIds,
  activeTabId,
  onSelectionChange,
  layoutsData,
}: UseLayoutOperationsArgs) {
  const {
    selectSlot,
    selectBlock,
    clearSelection,
    pushCommand,
    isUndoRedoExecuting,
    copiedBlock,
  } = useEditorContext();

  const { layouts: layoutMutations } = useEditorMutations();

  // Track last known block content for undo
  const lastKnownContentRef: MutableRefObject<Map<string, AnyContent>> = useRef(
    new Map(),
  );

  // Seed content ref from query data
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

  const handleReorderLayouts = async (
    draggedIds: string[],
    otherIds: string[],
    oldIndex: number,
    newIndex: number,
  ) => {
    const oldOrder = [...draggedIds];
    const newDraggedOrder = arrayMove(draggedIds, oldIndex, newIndex);
    const newOrder = [...newDraggedOrder, ...otherIds];

    await layoutMutations.reorder({ pageId, layoutIds: newOrder });

    if (!isUndoRedoExecuting) {
      const undoOrder = [...oldOrder, ...otherIds];
      pushCommand({
        description: "Reorder layouts",
        pageId,
        undo: async () => {
          await layoutMutations.reorder({ pageId, layoutIds: undoOrder });
        },
        redo: async () => {
          await layoutMutations.reorder({ pageId, layoutIds: newOrder });
        },
      });
    }
  };

  const handleMainLayoutDragEnd = async (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = mainLayoutIds.indexOf(String(active.id));
    const newIndex = mainLayoutIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    await handleReorderLayouts(
      mainLayoutIds,
      sidebarLayoutIds,
      oldIndex,
      newIndex,
    );
  };

  const handleSidebarLayoutDragEnd = async (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sidebarLayoutIds.indexOf(String(active.id));
    const newIndex = sidebarLayoutIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    await handleReorderLayouts(
      sidebarLayoutIds,
      mainLayoutIds,
      oldIndex,
      newIndex,
    );
  };

  const handleAddLayout = async (type: LayoutType) => {
    const newLayout = createLayout(type);
    const layoutId = await layoutMutations.create({
      pageId,
      type: newLayout.type,
      slots: newLayout.slots,
      settings: newLayout.settings,
      tabId: activeTabId ?? undefined,
    });

    if (newLayout.slots.length > 0) {
      setTimeout(() => {
        selectSlot(layoutId, newLayout.slots[0]!.id);
        onSelectionChange?.(newLayout.slots[0]!.id);
      }, 100);
    }

    if (!isUndoRedoExecuting) {
      const layoutIdRef = { value: layoutId };
      pushCommand({
        description: `Add ${type} layout`,
        pageId,
        undo: async () => {
          await layoutMutations.remove({ layoutId: layoutIdRef.value });
          clearSelection();
        },
        redo: async () => {
          const newId = await layoutMutations.create({
            pageId,
            type: newLayout.type,
            slots: newLayout.slots,
            settings: newLayout.settings,
            tabId: activeTabId ?? undefined,
          });
          layoutIdRef.value = newId;
        },
      });
    }
  };

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

  const handleRemoveLayout = async (layoutId: string) => {
    const layout = allLayouts.find((l) => l.id === layoutId);

    await layoutMutations.remove({ layoutId });
    clearSelection();

    if (!isUndoRedoExecuting && layout) {
      const snapshot = structuredClone(layout);
      const layoutIdRef = { value: layoutId };
      pushCommand({
        description: "Remove layout",
        pageId,
        undo: async () => {
          const newId = await layoutMutations.create({
            pageId,
            type: snapshot.type,
            slots: snapshot.slots.map((s) => ({
              id: s.id,
              position: s.position,
              blocks: s.blocks.map((b) => ({
                id: b.id,
                type: b.type,
                content: b.content,
              })),
            })),
            settings: snapshot.settings,
            tabId: snapshot.tabId ?? undefined,
          });
          layoutIdRef.value = newId;
        },
        redo: async () => {
          await layoutMutations.remove({ layoutId: layoutIdRef.value });
          clearSelection();
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

  const handleUpdateSettings = async (
    layoutId: string,
    settings: LayoutSettings,
  ) => {
    const layout = allLayouts.find((l) => l.id === layoutId);
    const oldSettings = layout ? structuredClone(layout.settings) : null;

    await layoutMutations.updateSettings({ layoutId, settings });

    if (!isUndoRedoExecuting && oldSettings) {
      const newSettings = structuredClone(settings);
      pushCommand({
        description: "Update layout settings",
        pageId,
        undo: async () => {
          await layoutMutations.updateSettings({
            layoutId,
            settings: oldSettings,
          });
        },
        redo: async () => {
          await layoutMutations.updateSettings({
            layoutId,
            settings: newSettings,
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
    handleMainLayoutDragEnd,
    handleSidebarLayoutDragEnd,
    handleAddLayout,
    handleUpdateBlock,
    handleRemoveBlock,
    handleRemoveLayout,
    handleMoveBlock,
    handleUpdateSettings,
    handlePasteBlock,
  };
}
