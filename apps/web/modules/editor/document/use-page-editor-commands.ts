"use client";

import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { AnyContent, LayoutSettings, LayoutType } from "@baseblocks/domain";
import { arrayMove } from "@dnd-kit/sortable";
import { useMutation } from "convex/react";
import { nanoid } from "nanoid";

interface PageTab {
  id: string;
  label: string;
}

export function usePageEditorCommands(pageId: string) {
  const createLayoutMutation = useMutation(api.layouts.mutations.create);
  const removeLayoutMutation = useMutation(api.layouts.mutations.remove);
  const reorderLayoutsMutation = useMutation(api.layouts.mutations.reorder);
  const updateLayoutSettingsMutation = useMutation(
    api.layouts.mutations.updateSettings,
  );
  const updateBlockMutation = useMutation(
    api.layouts.mutations.updateBlockInSlot,
  );
  const removeBlockMutation = useMutation(
    api.layouts.mutations.removeBlockFromSlot,
  );
  const moveBlockMutation = useMutation(api.layouts.mutations.moveBlock);
  const updatePageTabsMutation = useMutation(
    api.pages.mutations.updatePageTabs,
  );
  const disablePageTabsMutation = useMutation(
    api.pages.mutations.disablePageTabs,
  );

  const reorderLayouts = async (
    draggedIds: string[],
    otherIds: string[],
    oldIndex: number,
    newIndex: number,
  ) => {
    const nextDraggedOrder = arrayMove(draggedIds, oldIndex, newIndex);
    await reorderLayoutsMutation({
      pageId: pageId as Id<"pages">,
      layoutIds: [...nextDraggedOrder, ...otherIds] as Id<"layouts">[],
    });
  };

  return {
    addLayout: (type: LayoutType, tabId?: string | null) =>
      createLayoutMutation({
        pageId: pageId as Id<"pages">,
        type,
        tabId: tabId ?? undefined,
      }),
    addTab: async (pageTabs: PageTab[]) => {
      const tab = { id: nanoid(10), label: `Tab ${pageTabs.length + 1}` };
      await updatePageTabsMutation({
        pageId: pageId as Id<"pages">,
        pageTabs: [...pageTabs, tab],
      });
      return tab;
    },
    disableTabs: () =>
      disablePageTabsMutation({ pageId: pageId as Id<"pages"> }),
    moveBlock: (
      layoutId: string,
      fromSlotId: string,
      toSlotId: string,
      blockId: string,
      toIndex: number,
    ) =>
      moveBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        fromSlotId,
        toSlotId,
        blockId,
        toIndex,
      }),
    removeBlock: (layoutId: string, slotId: string, blockId: string) =>
      removeBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        blockId,
      }),
    removeLayout: (layoutId: string) =>
      removeLayoutMutation({ layoutId: layoutId as Id<"layouts"> }),
    removeTab: async (pageTabs: PageTab[], tabId: string) => {
      const nextTabs = pageTabs.filter((tab) => tab.id !== tabId);
      await updatePageTabsMutation({
        pageId: pageId as Id<"pages">,
        pageTabs: nextTabs,
      });
      return nextTabs;
    },
    renameTab: (pageTabs: PageTab[], tabId: string, label: string) =>
      updatePageTabsMutation({
        pageId: pageId as Id<"pages">,
        pageTabs: pageTabs.map((tab) =>
          tab.id === tabId ? { ...tab, label: label.trim() || tab.label } : tab,
        ),
      }),
    reorderLayouts,
    updateBlock: (
      layoutId: string,
      slotId: string,
      blockId: string,
      content: AnyContent,
    ) =>
      updateBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        blockId,
        content,
      }),
    updateSettings: (layoutId: string, settings: LayoutSettings) =>
      updateLayoutSettingsMutation({
        layoutId: layoutId as Id<"layouts">,
        settings,
      }),
  };
}
