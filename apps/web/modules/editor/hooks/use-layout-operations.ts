"use client";

import { useBlockOperations } from "@/modules/editor/hooks/use-block-operations";
import {
  useEditorUi,
  useEditorUndo,
} from "@/modules/shared/contexts/editor-context";
import { useEditorMutations } from "@/modules/shared/contexts/editor-mutations";
import { arrayMove } from "@/modules/shared/dnd";
import { createLayout } from "@/modules/shared/layouts";
import type { LayoutData, LayoutSettings, LayoutType } from "@baseblocks/types";

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
  const { selectSlot, clearSelection } = useEditorUi();
  const { pushCommand, isUndoRedoExecuting } = useEditorUndo();

  const { layouts: layoutMutations } = useEditorMutations();
  const {
    handleUpdateBlock,
    handleRemoveBlock,
    handleMoveBlock,
    handlePasteBlock,
  } = useBlockOperations({
    pageId,
    allLayouts,
    onSelectionChange,
    layoutsData,
    layoutMutations,
  });

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
