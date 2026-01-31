"use client";

import { DndProvider, type DragEndEvent, arrayMove } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveStatus } from "@/hooks";
import { createLayout } from "@/lib/layouts";
import { cn } from "@/lib/utils";
import type {
  AnyContent,
  LayoutBlockType,
  LayoutData,
  LayoutSettings,
  LayoutType,
} from "@/types";
import { api } from "@repo/backend";
import type { Doc, Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useEditorContext } from "./editor-context";
import { SortableLayout } from "./layouts/sortable-layout";
import { SaveIndicator } from "./save-indicator";

interface PageEditorProps {
  pageId: string;
  onSelectionChange?: (slotId: string | null) => void;
}

export function PageEditor({ pageId, onSelectionChange }: PageEditorProps) {
  const { selection, selectLayout, selectSlot, selectBlock, clearSelection } =
    useEditorContext();
  const { status, setStatus } = useSaveStatus();

  // Queries
  const pageData = useQuery(api.pages.queries.get, {
    pageId: pageId as Id<"pages">,
  });
  const layoutsData = useQuery(api.layouts.queries.list, {
    pageId: pageId as Id<"pages">,
  });

  // Mutations
  const createLayoutMutation = useMutation(api.layouts.mutations.create);
  const reorderLayoutsMutation = useMutation(api.layouts.mutations.reorder);
  const updateBlockMutation = useMutation(
    api.layouts.mutations.updateBlockInSlot,
  );
  const removeBlockMutation = useMutation(
    api.layouts.mutations.removeBlockFromSlot,
  );
  const removeLayoutMutation = useMutation(api.layouts.mutations.remove);
  const moveBlockMutation = useMutation(api.layouts.mutations.moveBlock);
  const updateSettingsMutation = useMutation(
    api.layouts.mutations.updateSettings,
  );

  // Convert layouts from DB to LayoutData format
  type LayoutDoc = Doc<"layouts">;
  type SlotDoc = LayoutDoc["slots"][number];
  type BlockDoc = SlotDoc["blocks"][number];
  const layouts: LayoutData[] = useMemo(() => {
    if (!layoutsData) return [];
    return layoutsData.map((s: LayoutDoc) => ({
      id: s._id,
      type: s.type as LayoutType,
      order: s.order,
      slots: s.slots.map((slot: SlotDoc) => ({
        id: slot.id,
        position: slot.position,
        blocks: slot.blocks.map((block: BlockDoc) => ({
          id: block.id,
          type: block.type as LayoutBlockType,
          content: block.content as AnyContent,
        })),
      })),
      settings: s.settings as LayoutSettings,
    }));
  }, [layoutsData]);

  // Separate main layouts from sidebar layouts
  const mainLayouts = useMemo(
    () => layouts.filter((s) => s.type !== "vertical"),
    [layouts],
  );
  const sidebarLayouts = useMemo(
    () => layouts.filter((s) => s.type === "vertical"),
    [layouts],
  );
  const hasSidebar = sidebarLayouts.length > 0;

  // Layout IDs for DnD (main layouts only for now)
  const mainLayoutIds = useMemo(
    () => mainLayouts.map((s) => s.id),
    [mainLayouts],
  );
  const sidebarLayoutIds = useMemo(
    () => sidebarLayouts.map((s) => s.id),
    [sidebarLayouts],
  );

  // Handle layout drag end for main layouts
  const handleMainLayoutDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = mainLayoutIds.indexOf(String(active.id));
      const newIndex = mainLayoutIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newMainOrder = arrayMove(mainLayoutIds, oldIndex, newIndex);
      // Combine with sidebar layouts (they come after main layouts)
      const newOrder = [...newMainOrder, ...sidebarLayoutIds];
      await reorderLayoutsMutation({
        pageId: pageId as Id<"pages">,
        layoutIds: newOrder as Id<"layouts">[],
      });
    },
    [mainLayoutIds, sidebarLayoutIds, pageId, reorderLayoutsMutation],
  );

  // Handle layout drag end for sidebar layouts
  const handleSidebarLayoutDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sidebarLayoutIds.indexOf(String(active.id));
      const newIndex = sidebarLayoutIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newSidebarOrder = arrayMove(sidebarLayoutIds, oldIndex, newIndex);
      // Combine with main layouts (they come before sidebar layouts)
      const newOrder = [...mainLayoutIds, ...newSidebarOrder];
      await reorderLayoutsMutation({
        pageId: pageId as Id<"pages">,
        layoutIds: newOrder as Id<"layouts">[],
      });
    },
    [mainLayoutIds, sidebarLayoutIds, pageId, reorderLayoutsMutation],
  );

  // Notify parent of slot selection changes
  const handleSelectSlot = useCallback(
    (layoutId: string, slotId: string) => {
      selectSlot(layoutId, slotId);
      onSelectionChange?.(slotId);
    },
    [selectSlot, onSelectionChange],
  );

  // Add a new layout
  const handleAddLayout = useCallback(
    async (type: LayoutType) => {
      const newLayout = createLayout(type);
      const layoutId = await createLayoutMutation({
        pageId: pageId as Id<"pages">,
        type: newLayout.type,
        slots: newLayout.slots,
        settings: newLayout.settings,
      });

      if (newLayout.slots.length > 0) {
        setTimeout(() => {
          selectSlot(layoutId as string, newLayout.slots[0]!.id);
          onSelectionChange?.(newLayout.slots[0]!.id);
        }, 100);
      }
    },
    [createLayoutMutation, pageId, selectSlot, onSelectionChange],
  );

  // Update block content
  const handleUpdateBlock = useCallback(
    async (
      layoutId: string,
      slotId: string,
      blockId: string,
      content: AnyContent,
    ) => {
      setStatus("saving");
      await updateBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        blockId,
        content,
      });
      setStatus("saved");
    },
    [updateBlockMutation, setStatus],
  );

  // Remove block
  const handleRemoveBlock = useCallback(
    async (layoutId: string, slotId: string, blockId: string) => {
      await removeBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        blockId,
      });
    },
    [removeBlockMutation],
  );

  // Remove layout
  const handleRemoveLayout = useCallback(
    async (layoutId: string) => {
      await removeLayoutMutation({
        layoutId: layoutId as Id<"layouts">,
      });
      clearSelection();
    },
    [removeLayoutMutation, clearSelection],
  );

  // Move block within layout
  const handleMoveBlock = useCallback(
    async (
      layoutId: string,
      fromSlotId: string,
      toSlotId: string,
      blockId: string,
      toIndex: number,
    ) => {
      await moveBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        fromSlotId,
        toSlotId,
        blockId,
        toIndex,
      });
    },
    [moveBlockMutation],
  );

  // Update layout settings (e.g., spacer height)
  const handleUpdateSettings = useCallback(
    async (layoutId: string, settings: LayoutSettings) => {
      setStatus("saving");
      await updateSettingsMutation({
        layoutId: layoutId as Id<"layouts">,
        settings,
      });
      setStatus("saved");
    },
    [updateSettingsMutation, setStatus],
  );

  // Handle click on editor background to deselect
  // Layouts/blocks call stopPropagation(), so this only fires for background clicks
  const handleEditorClick = useCallback(() => {
    clearSelection();
    onSelectionChange?.(null);
  }, [clearSelection, onSelectionChange]);

  // Render a layout with all its props
  const renderLayout = (layout: LayoutData) => (
    <SortableLayout
      key={layout.id}
      layout={layout}
      isSelected={selection.layoutId === layout.id}
      selectedSlotId={
        selection.layoutId === layout.id ? selection.slotId : null
      }
      selectedBlockId={
        selection.layoutId === layout.id ? selection.blockId : null
      }
      onSelectLayout={() => selectLayout(layout.id)}
      onSelectSlot={(slotId) => handleSelectSlot(layout.id, slotId)}
      onSelectBlock={(slotId, blockId) =>
        selectBlock(layout.id, slotId, blockId)
      }
      onAddBlock={(slotId) => handleSelectSlot(layout.id, slotId)}
      onUpdateBlock={(slotId, blockId, content) =>
        handleUpdateBlock(layout.id, slotId, blockId, content)
      }
      onRemoveBlock={(slotId, blockId) =>
        handleRemoveBlock(layout.id, slotId, blockId)
      }
      onMoveBlock={(fromSlotId, toSlotId, blockId, toIndex) =>
        handleMoveBlock(layout.id, fromSlotId, toSlotId, blockId, toIndex)
      }
      onRemove={() => handleRemoveLayout(layout.id)}
      onUpdateSettings={(settings) => handleUpdateSettings(layout.id, settings)}
    />
  );

  if (pageData === undefined || layoutsData === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  return (
    <div className="min-h-full w-full" onClick={handleEditorClick}>
      <div
        className={cn(
          "mx-auto relative",
          hasSidebar ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{pageData.title}</h1>
          <SaveIndicator status={status} />
        </div>

        {hasSidebar ? (
          // Layout with sidebar
          <div className="flex gap-6 pb-32">
            {/* Main content area */}
            <div className="flex-1 min-w-0 space-y-3 pl-10">
              {mainLayouts.length > 0 ? (
                <DndProvider
                  items={mainLayoutIds}
                  onDragEnd={handleMainLayoutDragEnd}
                >
                  {mainLayouts.map((layout) => renderLayout(layout))}
                </DndProvider>
              ) : (
                <div
                  className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-muted-foreground text-sm mb-3">
                    Add a layout to main content
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLayout("single")}
                    >
                      <Plus className="h-3 w-3 mr-1.5" />
                      Single
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddLayout("columns")}
                    >
                      <Plus className="h-3 w-3 mr-1.5" />
                      Columns
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar area */}
            <aside className="w-72 flex-shrink-0 border-l pl-6 space-y-3">
              <DndProvider
                items={sidebarLayoutIds}
                onDragEnd={handleSidebarLayoutDragEnd}
              >
                {sidebarLayouts.map((layout) => renderLayout(layout))}
              </DndProvider>
            </aside>
          </div>
        ) : (
          // Standard layout without sidebar
          <div className="space-y-3 pb-32 pl-10">
            {layouts.length > 0 ? (
              <DndProvider
                items={mainLayoutIds}
                onDragEnd={handleMainLayoutDragEnd}
              >
                {layouts.map((layout) => renderLayout(layout))}
              </DndProvider>
            ) : (
              <div
                className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Add a layout to get started
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLayout("single")}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Single
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddLayout("columns")}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Columns
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { PageEditor as default };
