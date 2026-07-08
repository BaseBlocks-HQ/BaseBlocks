"use client";

import { useLayouts, usePage } from "@/lib/data";
import { useEditorUi } from "@/modules/editor/state/editor-context";
import { DndProvider } from "@/modules/editor/drag/dnd";
import type {
  AnyContent,
  LayoutBlockType,
  LayoutData,
  LayoutSettings,
  LayoutType,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { SortableLayout } from "../layouts/layout-renderer";
import { PageTabBar } from "./tabs/page-tab-bar";
import { usePageEditorCommands } from "./use-page-editor-commands";

const editorLayoutStackClassName = "space-y-2";

interface PageData {
  title: string;
  pageTabs: { id: string; label: string }[];
}

interface LayoutDoc {
  _id: string;
  type: LayoutType;
  order: number;
  tabId?: string;
  slots: {
    id: string;
    position: number;
    blocks: { id: string; type: string; content: unknown }[];
  }[];
  settings: LayoutSettings;
}

function EmptyLayoutsState({
  hasTabs,
  onAddLayout,
}: {
  hasTabs: boolean;
  onAddLayout: (layoutType: "single" | "columns") => void;
}) {
  const t = useTranslations("editor.pageEditor");
  const tLayouts = useTranslations("editor.layouts");
  return (
    <div
      className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
      role="presentation"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <p className="text-muted-foreground text-sm mb-3">
        {hasTabs ? t("emptyWithTabs") : t("emptyNoTabs")}
      </p>
      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddLayout("single")}
        >
          <Plus className="h-3 w-3 mr-1.5" />
          {tLayouts("single")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddLayout("columns")}
        >
          <Plus className="h-3 w-3 mr-1.5" />
          {tLayouts("columns")}
        </Button>
      </div>
    </div>
  );
}

function LayoutsContent({
  emptyState,
  handleMainLayoutDragEnd,
  handleSidebarLayoutDragEnd,
  hasSidebar,
  layouts,
  mainLayoutIds,
  mainLayouts,
  sidebarLayoutIds,
  sidebarLayouts,
}: {
  emptyState: React.ReactNode;
  handleMainLayoutDragEnd: Parameters<typeof DndProvider>[0]["onDragEnd"];
  handleSidebarLayoutDragEnd: Parameters<typeof DndProvider>[0]["onDragEnd"];
  hasSidebar: boolean;
  layouts: React.ReactNode[];
  mainLayoutIds: string[];
  mainLayouts: React.ReactNode[];
  sidebarLayoutIds: string[];
  sidebarLayouts: React.ReactNode[];
}) {
  if (hasSidebar) {
    return (
      <div className="flex gap-8">
        <div className={cn("min-w-0 flex-1", editorLayoutStackClassName)}>
          {mainLayouts.length > 0 ? (
            <DndProvider
              items={mainLayoutIds}
              onDragEnd={handleMainLayoutDragEnd}
            >
              {mainLayouts}
            </DndProvider>
          ) : (
            emptyState
          )}
        </div>
        <aside className={cn("w-72 flex-shrink-0", editorLayoutStackClassName)}>
          <DndProvider
            items={sidebarLayoutIds}
            onDragEnd={handleSidebarLayoutDragEnd}
          >
            {sidebarLayouts}
          </DndProvider>
        </aside>
      </div>
    );
  }

  return (
    <div className={editorLayoutStackClassName}>
      {layouts.length > 0 ? (
        <DndProvider items={mainLayoutIds} onDragEnd={handleMainLayoutDragEnd}>
          {layouts}
        </DndProvider>
      ) : (
        emptyState
      )}
    </div>
  );
}

interface PageEditorProps {
  pageId: string;
  onSelectionChange?: (slotId: string | null) => void;
  /** When true, uses local state instead of shared context for tabs/currentPageId (used in the page panel) */
  nested?: boolean;
}

export function PageEditor({
  pageId,
  onSelectionChange,
  nested,
}: PageEditorProps) {
  const tPage = useTranslations("editor.pageEditor");
  const rawPage = usePage(pageId);
  const rawLayouts = useLayouts(pageId);
  const pageData: PageData | undefined = rawPage
    ? { title: rawPage.title, pageTabs: rawPage.pageTabs ?? [] }
    : undefined;
  const layoutsData: LayoutDoc[] | undefined = rawLayouts?.map((layout) => ({
    _id: layout._id as string,
    type: layout.type as LayoutType,
    order: layout.order,
    tabId: layout.tabId,
    slots: layout.slots.map((slot) => ({
      id: slot.id,
      position: slot.position,
      blocks: slot.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        content: block.content,
      })),
    })),
    settings: layout.settings as LayoutSettings,
  }));
  const {
    selection,
    selectLayout,
    selectSlot,
    selectBlock,
    clearSelection,
    activeTabId: contextActiveTabId,
    setActiveTabId: contextSetActiveTabId,
    setCurrentPageId,
  } = useEditorUi();

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
  const firstTabId = pageTabs[0]?.id ?? null;
  const hasActiveTab = activeTabId
    ? pageTabs.some((tab) => tab.id === activeTabId)
    : false;
  const resolvedActiveTabId = hasTabs
    ? hasActiveTab
      ? activeTabId
      : firstTabId
    : null;

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
    ? allLayouts.filter((l) => l.tabId === resolvedActiveTabId)
    : allLayouts;

  // Separate main layouts from sidebar layouts
  const mainLayouts = layouts.filter((s) => s.type !== "vertical");
  const sidebarLayouts = layouts.filter((s) => s.type === "vertical");
  const hasSidebar = sidebarLayouts.length > 0;

  const mainLayoutIds = mainLayouts.map((s) => s.id);
  const sidebarLayoutIds = sidebarLayouts.map((s) => s.id);
  const commands = usePageEditorCommands(pageId);

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const tabInputRef = useRef<HTMLInputElement>(null);

  const handleMainLayoutDragEnd = async (event: {
    active: { id: string | number };
    over: { id: string | number } | null;
  }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = mainLayoutIds.indexOf(String(active.id));
    const newIndex = mainLayoutIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    await commands.reorderLayouts(
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

    await commands.reorderLayouts(
      sidebarLayoutIds,
      mainLayoutIds,
      oldIndex,
      newIndex,
    );
  };

  const handleAddLayout = async (type: LayoutType) => {
    const created = await commands.addLayout(type, resolvedActiveTabId);

    if (created.firstSlotId) {
      const firstSlotId = created.firstSlotId;
      setTimeout(() => {
        selectSlot(created.layoutId as string, firstSlotId);
        onSelectionChange?.(firstSlotId);
      }, 100);
    }
  };

  const handleRemoveLayout = async (layoutId: string) => {
    await commands.removeLayout(layoutId);
    clearSelection();
  };

  const handleDisableTabs = async () => {
    await commands.disableTabs();
    setActiveTabId(null);
  };

  const handleAddTab = async () => {
    const tab = await commands.addTab(pageTabs);
    setActiveTabId(tab.id);
  };

  const handleRemoveTab = async (tabId: string) => {
    if (pageTabs.length <= 2) return;
    const nextTabs = await commands.removeTab(pageTabs, tabId);
    if (resolvedActiveTabId === tabId) {
      setActiveTabId(nextTabs[0]?.id ?? null);
    }
  };

  const handleStartRenameTab = (tab: { id: string; label: string }) => {
    setEditingTabId(tab.id);
    setEditingLabel(tab.label);
    setTimeout(() => tabInputRef.current?.select(), 0);
  };

  const handleFinishRenameTab = async () => {
    if (!editingTabId) return;
    await commands.renameTab(pageTabs, editingTabId, editingLabel);
    setEditingTabId(null);
  };

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
        commands.updateBlock(layout.id, slotId, blockId, content)
      }
      onRemoveBlock={(slotId, blockId) =>
        commands.removeBlock(layout.id, slotId, blockId)
      }
      onMoveBlock={(fromSlotId, toSlotId, blockId, toIndex) =>
        commands.moveBlock(layout.id, fromSlotId, toSlotId, blockId, toIndex)
      }
      onRemove={() => handleRemoveLayout(layout.id)}
      onUpdateSettings={(settings) =>
        commands.updateSettings(layout.id, settings)
      }
    />
  );

  const emptyState = (
    <EmptyLayoutsState hasTabs={hasTabs} onAddLayout={handleAddLayout} />
  );
  const renderedLayouts = layouts.map((layout) => renderLayout(layout));
  const renderedMainLayouts = mainLayouts.map((layout) => renderLayout(layout));
  const renderedSidebarLayouts = sidebarLayouts.map((layout) =>
    renderLayout(layout),
  );

  if (pageData === undefined || layoutsData === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!pageData) {
    return <p className="text-muted-foreground">{tPage("pageNotFound")}</p>;
  }

  return (
    <div
      role="presentation"
      className="min-h-full w-full"
      onMouseDown={(e) => {
        if (e.button !== 0) {
          return;
        }
        handleEditorClick();
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
            activeTabId={resolvedActiveTabId}
            setActiveTabId={setActiveTabId}
            editingTabId={editingTabId}
            editingLabel={editingLabel}
            setEditingLabel={setEditingLabel}
            setEditingTabId={setEditingTabId}
            tabInputRef={tabInputRef}
            onDisableTabs={handleDisableTabs}
            onAddTab={handleAddTab}
            onRemoveTab={handleRemoveTab}
            onStartRenameTab={handleStartRenameTab}
            onFinishRenameTab={handleFinishRenameTab}
          />
        )}

        <LayoutsContent
          emptyState={emptyState}
          handleMainLayoutDragEnd={handleMainLayoutDragEnd}
          handleSidebarLayoutDragEnd={handleSidebarLayoutDragEnd}
          hasSidebar={hasSidebar}
          layouts={renderedLayouts}
          mainLayoutIds={mainLayoutIds}
          mainLayouts={renderedMainLayouts}
          sidebarLayoutIds={sidebarLayoutIds}
          sidebarLayouts={renderedSidebarLayouts}
        />
      </div>
    </div>
  );
}
