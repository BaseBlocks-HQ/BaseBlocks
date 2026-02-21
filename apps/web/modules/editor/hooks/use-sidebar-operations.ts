import { getDefaultContent } from "@/modules/elements/framework/registry";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import {
  createBlock,
  createLayout,
  generateId,
} from "@/modules/shared/layouts";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type { AnyContent, ElementType, LayoutBlockType, LayoutType } from "@baseblocks/types";
import { useMutation } from "convex/react";
import { toast } from "sonner";

interface UseSidebarOperationsOptions {
  selectedPageId: Id<"pages"> | undefined;
}

export function useSidebarOperations({
  selectedPageId,
}: UseSidebarOperationsOptions) {
  const {
    selection,
    selectSlot,
    editingSubpage,
    activeTabId,
    pushCommand,
    isUndoRedoExecuting,
    currentPageId,
  } = useEditorContext();

  const createLayoutMutation = useMutation(api.layouts.mutations.create);
  const addBlockMutation = useMutation(api.layouts.mutations.addBlockToSlot);
  const addSubpageBlockMutation = useMutation(
    api.layouts.mutations.addSubpageBlock,
  );
  const removeLayoutMutation = useMutation(api.layouts.mutations.remove);
  const removeBlockMutation = useMutation(
    api.layouts.mutations.removeBlockFromSlot,
  );
  const enablePageTabsMutation = useMutation(
    api.pages.mutations.enablePageTabs,
  );

  const handleAddLayout = async (type: LayoutType) => {
    const targetPageId = editingSubpage
      ? (editingSubpage.pageId as Id<"pages">)
      : selectedPageId;

    if (!targetPageId) return;

    const newLayout = createLayout(type);
    const pageIdStr = targetPageId as string;
    const layoutId = await createLayoutMutation({
      pageId: targetPageId,
      type: newLayout.type,
      slots: newLayout.slots,
      settings: newLayout.settings,
      tabId: editingSubpage ? undefined : (activeTabId ?? undefined),
    });

    if (newLayout.slots.length > 0) {
      setTimeout(() => {
        selectSlot(layoutId as string, newLayout.slots[0]!.id);
      }, 100);
    }

    if (!isUndoRedoExecuting) {
      const layoutIdRef = { value: layoutId as string };
      pushCommand({
        description: `Add ${type} layout`,
        pageId: pageIdStr,
        undo: async () => {
          await removeLayoutMutation({
            layoutId: layoutIdRef.value as Id<"layouts">,
          });
        },
        redo: async () => {
          const newId = await createLayoutMutation({
            pageId: targetPageId,
            type: newLayout.type,
            slots: newLayout.slots,
            settings: newLayout.settings,
            tabId: editingSubpage ? undefined : (activeTabId ?? undefined),
          });
          layoutIdRef.value = newId as string;
        },
      });
    }
  };

  const handleAddBlock = async (type: ElementType) => {
    if (!selection.layoutId || !selection.slotId) return;

    if (type === "subpage") {
      const blockId = generateId();
      const title = "New Sub-page";
      const slug = `sub-page-${blockId.slice(0, 8)}`;

      try {
        await addSubpageBlockMutation({
          layoutId: selection.layoutId as Id<"layouts">,
          slotId: selection.slotId,
          blockId,
          title,
          slug,
        });
      } catch (_error) {
        toast.error("Failed to create sub-page");
      }
      return;
    }

    const content = getDefaultContent(type);
    if (!content) return;

    const newBlock = createBlock(type as LayoutBlockType, content);
    const layoutId = selection.layoutId;
    const slotId = selection.slotId;

    await addBlockMutation({
      layoutId: layoutId as Id<"layouts">,
      slotId,
      block: {
        id: newBlock.id,
        type: newBlock.type,
        content: newBlock.content as AnyContent,
      },
    });

    if (!isUndoRedoExecuting && currentPageId) {
      pushCommand({
        description: `Add ${type} block`,
        pageId: currentPageId,
        undo: async () => {
          await removeBlockMutation({
            layoutId: layoutId as Id<"layouts">,
            slotId,
            blockId: newBlock.id,
          });
        },
        redo: async () => {
          await addBlockMutation({
            layoutId: layoutId as Id<"layouts">,
            slotId,
            block: {
              id: newBlock.id,
              type: newBlock.type,
              content: newBlock.content as AnyContent,
            },
          });
        },
      });
    }
  };

  const handleEnableTabs = async () => {
    const targetPageId = editingSubpage
      ? (editingSubpage.pageId as Id<"pages">)
      : selectedPageId;

    if (!targetPageId) return;
    await enablePageTabsMutation({
      pageId: targetPageId,
      tabs: [
        { id: generateId(), label: "Tab 1" },
        { id: generateId(), label: "Tab 2" },
      ],
    });
  };

  return { handleAddLayout, handleAddBlock, handleEnableTabs };
}
