"use client";

import {
  type EditorMutations,
  EditorMutationsProvider,
} from "@/modules/editor/contexts/editor-mutations";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { LayoutType } from "@baseblocks/types";
import { useMutation } from "convex/react";

/**
 * Bridges all Convex mutations into the backend-agnostic EditorMutations interface.
 */
export function ConvexEditorMutationsProvider({
  children,
}: { children: React.ReactNode }) {
  // Layout mutations
  const createLayoutMut = useMutation(api.layouts.mutations.create);
  const removeLayoutMut = useMutation(api.layouts.mutations.remove);
  const reorderLayoutsMut = useMutation(api.layouts.mutations.reorder);
  const updateBlockMut = useMutation(api.layouts.mutations.updateBlockInSlot);
  const removeBlockMut = useMutation(api.layouts.mutations.removeBlockFromSlot);
  const addBlockMut = useMutation(api.layouts.mutations.addBlockToSlot);
  const moveBlockMut = useMutation(api.layouts.mutations.moveBlock);
  const updateSettingsMut = useMutation(api.layouts.mutations.updateSettings);

  // Page mutations
  const updatePageTabsMut = useMutation(api.pages.mutations.updatePageTabs);
  const disablePageTabsMut = useMutation(api.pages.mutations.disablePageTabs);
  const enablePageTabsMut = useMutation(api.pages.mutations.enablePageTabs);
  const updatePageMut = useMutation(api.pages.mutations.update);

  const mutations: EditorMutations = {
    layouts: {
      create: async (args) => {
        const id = await createLayoutMut({
          pageId: args.pageId as Id<"pages">,
          type: args.type as LayoutType,
          slots: args.slots as Parameters<typeof createLayoutMut>[0]["slots"],
          settings: args.settings,
          tabId: args.tabId,
        });
        return id as string;
      },
      remove: async (args) => {
        await removeLayoutMut({
          layoutId: args.layoutId as Id<"layouts">,
        });
      },
      reorder: async (args) => {
        await reorderLayoutsMut({
          pageId: args.pageId as Id<"pages">,
          layoutIds: args.layoutIds as Id<"layouts">[],
        });
      },
      updateBlockInSlot: async (args) => {
        await updateBlockMut({
          layoutId: args.layoutId as Id<"layouts">,
          slotId: args.slotId,
          blockId: args.blockId,
          content: args.content,
        });
      },
      removeBlockFromSlot: async (args) => {
        await removeBlockMut({
          layoutId: args.layoutId as Id<"layouts">,
          slotId: args.slotId,
          blockId: args.blockId,
        });
      },
      addBlockToSlot: async (args) => {
        await addBlockMut({
          layoutId: args.layoutId as Id<"layouts">,
          slotId: args.slotId,
          block: args.block as Parameters<typeof addBlockMut>[0]["block"],
          index: args.index,
        });
      },
      moveBlock: async (args) => {
        await moveBlockMut({
          layoutId: args.layoutId as Id<"layouts">,
          fromSlotId: args.fromSlotId,
          toSlotId: args.toSlotId,
          blockId: args.blockId,
          toIndex: args.toIndex,
        });
      },
      updateSettings: async (args) => {
        await updateSettingsMut({
          layoutId: args.layoutId as Id<"layouts">,
          settings: args.settings,
        });
      },
    },
    pages: {
      updatePageTabs: async (args) => {
        await updatePageTabsMut({
          pageId: args.pageId as Id<"pages">,
          pageTabs: args.pageTabs,
        });
      },
      disablePageTabs: async (args) => {
        await disablePageTabsMut({
          pageId: args.pageId as Id<"pages">,
        });
      },
      enablePageTabs: async (args) => {
        await enablePageTabsMut({
          pageId: args.pageId as Id<"pages">,
          tabs: args.tabs,
        });
      },
      update: async (args) => {
        await updatePageMut({
          pageId: args.pageId as Id<"pages">,
          title: args.title,
        });
      },
    },
  };

  return (
    <EditorMutationsProvider mutations={mutations}>
      {children}
    </EditorMutationsProvider>
  );
}
