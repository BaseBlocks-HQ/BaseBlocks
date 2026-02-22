"use client";

import { useLayoutOperations } from "@/modules/editor/hooks/use-layout-operations";
import { usePageTabs } from "@/modules/editor/hooks/use-page-tabs";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import { DndProvider } from "@/modules/shared/dnd";
import type { LayoutDoc, PageData } from "@/modules/shared/types";
import type {
  AnyContent,
  LayoutBlockType,
  LayoutData,
  LayoutSettings,
  LayoutType,
} from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { SortableLayout } from "./layouts/sortable-layout";
import { PageTabBar } from "./page-tab-bar";

function ContentSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="animate-pulse space-y-4 w-full max-w-2xl">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-2/3" />
        <div className="h-32 bg-muted rounded w-full" />
      </div>
    </div>
  );
}

interface PageEditorProps {
  pageId: string;
  pageData?: PageData;
  layouts?: LayoutDoc[];
  onSelectionChange?: (slotId: string | null) => void;
  /** When true, uses local state instead of shared context for tabs/currentPageId (used in subpage panel) */
  nested?: boolean;
}

export function PageEditor({
  pageId,
  pageData,
  layouts: layoutsData,
  onSelectionChange,
  nested,
}: PageEditorProps) {
  const {
    selection,
    selectLayout,
    selectSlot,
    selectBlock,
    clearSelection,
    activeTabId: contextActiveTabId,
    setActiveTabId: contextSetActiveTabId,
    setCurrentPageId,
  } = useEditorContext();

  // Nested editors use local tab state to avoid fighting with the parent
  const [localActiveTabId, setLocalActiveTabId] = useState<string | null>(null);
  const activeTabId = nested ? localActiveTabId : contextActiveTabId;
  const setActiveTabId = nested ? setLocalActiveTabId : contextSetActiveTabId;

  // Set current page ID on context for keyboard shortcuts (skip for nested)
  useEffect(() => {
    if (nested) return;
    setCurrentPageId(pageId);
    return () => setCurrentPageId(null);
  }, [pageId, setCurrentPageId, nested]);

  // Page tabs
  const pageTabs = pageData?.pageTabs ?? [];
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

  // Convert layouts from doc format to LayoutData format
  const allLayouts: LayoutData[] = layoutsData
    ? layoutsData.map((s) => ({
        id: s._id,
        type: s.type as LayoutType,
        order: s.order,
        tabId: s.tabId,
        slots: s.slots.map((slot) => ({
          id: slot.id,
          position: slot.position,
          blocks: slot.blocks.map((block) => ({
            id: block.id,
            type: block.type as LayoutBlockType,
            content: block.content as AnyContent,
          })),
        })),
        settings: s.settings as LayoutSettings,
      }))
    : [];

  // Filter layouts by active tab
  const layouts = hasTabs
    ? allLayouts.filter((l) => l.tabId === activeTabId)
    : allLayouts;

  // Separate main layouts from sidebar layouts
  const mainLayouts = layouts.filter((s) => s.type !== "vertical");
  const sidebarLayouts = layouts.filter((s) => s.type === "vertical");
  const hasSidebar = sidebarLayouts.length > 0;

  const mainLayoutIds = mainLayouts.map((s) => s.id);
  const sidebarLayoutIds = sidebarLayouts.map((s) => s.id);

  // Layout operations (add/remove/update/move/reorder with undo)
  const {
    handleMainLayoutDragEnd,
    handleSidebarLayoutDragEnd,
    handleAddLayout,
    handleUpdateBlock,
    handleRemoveBlock,
    handleRemoveLayout,
    handleMoveBlock,
    handleUpdateSettings,
  } = useLayoutOperations({
    pageId,
    allLayouts,
    mainLayoutIds,
    sidebarLayoutIds,
    activeTabId,
    onSelectionChange,
    layoutsData,
  });

  // Tab operations (add/remove/rename/disable with undo)
  const tabs = usePageTabs({
    pageId,
    pageTabs,
    activeTabId,
    setActiveTabId,
  });

  // Notify parent of slot selection changes
  const handleSelectSlot = (layoutId: string, slotId: string) => {
    selectSlot(layoutId, slotId);
    onSelectionChange?.(slotId);
  };

  // Handle click on editor background to deselect
  const handleEditorClick = () => {
    clearSelection();
    onSelectionChange?.(null);
  };

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

  const renderEmptyState = () => (
    <div
      className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      tabIndex={-1}
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
    return <ContentSkeleton />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  return (
    <div
      className="min-h-full w-full"
      onClick={handleEditorClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleEditorClick();
        }
      }}
    >
      <div
        className={cn(
          "mx-auto relative",
          hasSidebar ? "max-w-6xl" : "max-w-4xl",
        )}
      >
        {!nested && (
          <h1 className="text-2xl font-semibold mb-6">{pageData.title}</h1>
        )}

        {hasTabs && (
          <PageTabBar
            pageTabs={pageTabs}
            activeTabId={activeTabId}
            setActiveTabId={setActiveTabId}
            editingTabId={tabs.editingTabId}
            editingLabel={tabs.editingLabel}
            setEditingLabel={tabs.setEditingLabel}
            setEditingTabId={tabs.setEditingTabId}
            tabInputRef={tabs.tabInputRef}
            onDisableTabs={tabs.handleDisableTabs}
            onAddTab={tabs.handleAddTab}
            onRemoveTab={tabs.handleRemoveTab}
            onStartRenameTab={tabs.handleStartRenameTab}
            onFinishRenameTab={tabs.handleFinishRenameTab}
          />
        )}

        {renderLayoutsContent()}
      </div>
    </div>
  );
}

export { PageEditor as default };
