"use client";

import { DndProvider, type DragEndEvent, arrayMove } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createLayout, generateId } from "@/lib/layouts";
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
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorContext } from "./editor-context";
import { SortableLayout } from "./layouts/sortable-layout";

interface PageEditorProps {
  pageId: string;
  onSelectionChange?: (slotId: string | null) => void;
}

export function PageEditor({ pageId, onSelectionChange }: PageEditorProps) {
  const {
    selection,
    selectLayout,
    selectSlot,
    selectBlock,
    clearSelection,
    markContentModified,
    activeTabId,
    setActiveTabId,
  } = useEditorContext();

  // Tab rename state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const tabInputRef = useRef<HTMLInputElement>(null);

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
    api.layouts.mutations.updateBlockInSlot
  );
  const removeBlockMutation = useMutation(
    api.layouts.mutations.removeBlockFromSlot
  );
  const removeLayoutMutation = useMutation(api.layouts.mutations.remove);
  const moveBlockMutation = useMutation(api.layouts.mutations.moveBlock);
  const updateSettingsMutation = useMutation(
    api.layouts.mutations.updateSettings
  );
  const updatePageTabsMutation = useMutation(
    api.pages.mutations.updatePageTabs
  );
  const disablePageTabsMutation = useMutation(
    api.pages.mutations.disablePageTabs
  );

  // Page tabs
  const pageTabs = useMemo(
    () => pageData?.pageTabs ?? [],
    [pageData],
  );
  const hasTabs = pageTabs.length > 0;

  // Auto-select first tab when tabs change
  useEffect(() => {
    if (hasTabs) {
      const tabExists = pageTabs.some((t) => t.id === activeTabId);
      if (!activeTabId || !tabExists) {
        const firstTab = pageTabs[0];
        if (firstTab) setActiveTabId(firstTab.id);
      }
    } else {
      setActiveTabId(null);
    }
  }, [pageTabs, hasTabs, activeTabId, setActiveTabId]);

  // Convert layouts from DB to LayoutData format
  type LayoutDoc = Doc<"layouts">;
  type SlotDoc = LayoutDoc["slots"][number];
  type BlockDoc = SlotDoc["blocks"][number];

  const allLayouts: LayoutData[] = useMemo(() => {
    if (!layoutsData) return [];
    return layoutsData.map((s: LayoutDoc) => ({
      id: s._id,
      type: s.type as LayoutType,
      order: s.order,
      tabId: s.tabId,
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

  // Filter layouts by active tab
  const layouts = useMemo(() => {
    if (!hasTabs) return allLayouts;
    return allLayouts.filter((l) => l.tabId === activeTabId);
  }, [allLayouts, hasTabs, activeTabId]);

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
      markContentModified();
    },
    [mainLayoutIds, sidebarLayoutIds, pageId, reorderLayoutsMutation, markContentModified],
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
      markContentModified();
    },
    [mainLayoutIds, sidebarLayoutIds, pageId, reorderLayoutsMutation, markContentModified],
  );

  // Notify parent of slot selection changes
  const handleSelectSlot = useCallback(
    (layoutId: string, slotId: string) => {
      selectSlot(layoutId, slotId);
      onSelectionChange?.(slotId);
    },
    [selectSlot, onSelectionChange],
  );

  // Add a new layout (scoped to active tab)
  const handleAddLayout = useCallback(
    async (type: LayoutType) => {
      const newLayout = createLayout(type);
      const layoutId = await createLayoutMutation({
        pageId: pageId as Id<"pages">,
        type: newLayout.type,
        slots: newLayout.slots,
        settings: newLayout.settings,
        tabId: activeTabId ?? undefined,
      });
      markContentModified();

      if (newLayout.slots.length > 0) {
        setTimeout(() => {
          selectSlot(layoutId as string, newLayout.slots[0]!.id);
          onSelectionChange?.(newLayout.slots[0]!.id);
        }, 100);
      }
    },
    [createLayoutMutation, pageId, activeTabId, selectSlot, onSelectionChange, markContentModified],
  );

  // Update block content
  const handleUpdateBlock = useCallback(
    async (
      layoutId: string,
      slotId: string,
      blockId: string,
      content: AnyContent
    ) => {
      await updateBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        blockId,
        content,
      });
      markContentModified();
    },
    [updateBlockMutation, markContentModified]
  );

  // Remove block
  const handleRemoveBlock = useCallback(
    async (layoutId: string, slotId: string, blockId: string) => {
      await removeBlockMutation({
        layoutId: layoutId as Id<"layouts">,
        slotId,
        blockId,
      });
      markContentModified();
    },
    [removeBlockMutation, markContentModified]
  );

  // Remove layout
  const handleRemoveLayout = useCallback(
    async (layoutId: string) => {
      await removeLayoutMutation({
        layoutId: layoutId as Id<"layouts">,
      });
      clearSelection();
      markContentModified();
    },
    [removeLayoutMutation, clearSelection, markContentModified],
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
      markContentModified();
    },
    [moveBlockMutation, markContentModified],
  );

  // Update layout settings
  const handleUpdateSettings = useCallback(
    async (layoutId: string, settings: LayoutSettings) => {
      await updateSettingsMutation({
        layoutId: layoutId as Id<"layouts">,
        settings,
      });
      markContentModified();
    },
    [updateSettingsMutation, markContentModified]
  );

  // === Page tab management ===
  const handleDisableTabs = useCallback(async () => {
    await disablePageTabsMutation({
      pageId: pageId as Id<"pages">,
    });
    setActiveTabId(null);
    markContentModified();
  }, [pageId, disablePageTabsMutation, markContentModified]);

  const handleAddTab = useCallback(async () => {
    const newTab = { id: generateId(), label: `Tab ${pageTabs.length + 1}` };
    await updatePageTabsMutation({
      pageId: pageId as Id<"pages">,
      pageTabs: [...pageTabs, newTab],
    });
    setActiveTabId(newTab.id);
    markContentModified();
  }, [pageId, pageTabs, updatePageTabsMutation, markContentModified]);

  const handleRemoveTab = useCallback(async (tabId: string) => {
    if (pageTabs.length <= 2) return;
    const newTabs = pageTabs.filter((t) => t.id !== tabId);
    await updatePageTabsMutation({
      pageId: pageId as Id<"pages">,
      pageTabs: newTabs,
    });
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0]?.id ?? null);
    }
    markContentModified();
  }, [pageId, pageTabs, activeTabId, updatePageTabsMutation, markContentModified]);

  const handleStartRenameTab = useCallback((tab: { id: string; label: string }) => {
    setEditingTabId(tab.id);
    setEditingLabel(tab.label);
    setTimeout(() => tabInputRef.current?.select(), 0);
  }, []);

  const handleFinishRenameTab = useCallback(async () => {
    if (!editingTabId) return;
    const newTabs = pageTabs.map((t) =>
      t.id === editingTabId
        ? { ...t, label: editingLabel.trim() || t.label }
        : t,
    );
    await updatePageTabsMutation({
      pageId: pageId as Id<"pages">,
      pageTabs: newTabs,
    });
    setEditingTabId(null);
    markContentModified();
  }, [editingTabId, editingLabel, pageTabs, pageId, updatePageTabsMutation, markContentModified]);

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

  // Empty state placeholder
  const renderEmptyState = () => (
    <div
      className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-muted-foreground text-sm mb-3">
        {hasTabs ? "Add a layout to this tab" : "Add a layout to get started"}
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
  );

  // Render the layouts content area (shared between sidebar/no-sidebar modes)
  const renderLayoutsContent = () => {
    if (hasSidebar) {
      return (
        <div className="flex gap-8 pb-32">
          <div className="flex-1 min-w-0 space-y-6">
            {mainLayouts.length > 0 ? (
              <DndProvider
                items={mainLayoutIds}
                onDragEnd={handleMainLayoutDragEnd}
              >
                {mainLayouts.map((layout) => renderLayout(layout))}
              </DndProvider>
            ) : (
              renderEmptyState()
            )}
          </div>
          <aside className="w-72 flex-shrink-0 space-y-6">
            <DndProvider
              items={sidebarLayoutIds}
              onDragEnd={handleSidebarLayoutDragEnd}
            >
              {sidebarLayouts.map((layout) => renderLayout(layout))}
            </DndProvider>
          </aside>
        </div>
      );
    }

    return (
      <div className="space-y-3 pb-32">
        {layouts.length > 0 ? (
          <DndProvider
            items={mainLayoutIds}
            onDragEnd={handleMainLayoutDragEnd}
          >
            {layouts.map((layout) => renderLayout(layout))}
          </DndProvider>
        ) : (
          renderEmptyState()
        )}
      </div>
    );
  };

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
        <h1 className="text-2xl font-semibold mb-6">{pageData.title}</h1>

        {/* Page-level tab bar */}
        {hasTabs && (
          <div
            className="group/tabbar mb-6 flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Delete tabs control - follows layout controls pattern */}
            <div className="opacity-0 group-hover/tabbar:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={handleDisableTabs}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <Tabs
              value={activeTabId ?? undefined}
              onValueChange={(value) => {
                setActiveTabId(value);
                clearSelection();
              }}
            >
              <TabsList>
                {pageTabs.map((tab, index) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="group/tab relative gap-1 px-4"
                  >
                    {editingTabId === tab.id ? (
                      <Input
                        ref={tabInputRef}
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        onBlur={handleFinishRenameTab}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleFinishRenameTab();
                          if (e.key === "Escape") setEditingTabId(null);
                        }}
                        className="h-5 w-20 px-1 py-0 text-sm border-none shadow-none focus-visible:ring-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="select-none">
                        {tab.label}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/tab:opacity-100 transition-opacity">
                      <span
                        role="button"
                        tabIndex={0}
                        className="h-4 w-4 rounded-sm flex items-center justify-center text-muted-foreground/50 hover:text-foreground cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRenameTab(tab);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            handleStartRenameTab(tab);
                          }
                        }}
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </span>
                      {index >= 2 && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="h-4 w-4 rounded-sm flex items-center justify-center text-muted-foreground/50 hover:text-destructive cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTab(tab.id);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.stopPropagation();
                              handleRemoveTab(tab.id);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={handleAddTab}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {renderLayoutsContent()}
      </div>
    </div>
  );
}

export { PageEditor as default };
