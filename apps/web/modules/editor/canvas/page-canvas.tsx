"use client";

import { getStoredAccessSessionTokens } from "@/modules/public-site/access-session";
import { useEditorUi } from "@/modules/editor/editor-state";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type {
  AnyContent,
  LayoutBlockType,
  LayoutData,
  LayoutSettings,
  LayoutType,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { cn } from "@baseblocks/ui/lib/utils";
import { Spinner } from "@baseblocks/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useTranslations } from "next-intl";
import type { KeyboardEvent, MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { SortableLayout } from "./layout-editor";

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
  handleMainLayoutDragEnd: (event: DragEndEvent) => void;
  handleSidebarLayoutDragEnd: (event: DragEndEvent) => void;
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
            <SortableGroup
              items={mainLayoutIds}
              onDragEnd={handleMainLayoutDragEnd}
            >
              {mainLayouts}
            </SortableGroup>
          ) : (
            emptyState
          )}
        </div>
        <aside className={cn("w-72 flex-shrink-0", editorLayoutStackClassName)}>
          <SortableGroup
            items={sidebarLayoutIds}
            onDragEnd={handleSidebarLayoutDragEnd}
          >
            {sidebarLayouts}
          </SortableGroup>
        </aside>
      </div>
    );
  }

  return (
    <div className={editorLayoutStackClassName}>
      {layouts.length > 0 ? (
        <SortableGroup
          items={mainLayoutIds}
          onDragEnd={handleMainLayoutDragEnd}
        >
          {layouts}
        </SortableGroup>
      ) : (
        emptyState
      )}
    </div>
  );
}

function SortableGroup({
  children,
  items,
  onDragEnd,
}: {
  children: React.ReactNode;
  items: string[];
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

interface PageTab {
  id: string;
  label: string;
}

function TabIconButton({
  "aria-label": ariaLabel,
  destructive = false,
  onClick,
  onKeyDown,
  children,
}: {
  "aria-label": string;
  destructive?: boolean;
  onClick: (event: MouseEvent<HTMLSpanElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLSpanElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label={ariaLabel}
      className={cn(
        "flex h-4 w-4 cursor-pointer items-center justify-center rounded-sm text-muted-foreground/50",
        destructive ? "hover:text-destructive" : "hover:text-foreground",
      )}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </span>
  );
}

function PageTabs({
  activeTabId,
  editingLabel,
  editingTabId,
  onAddTab,
  onDisableTabs,
  onFinishRenameTab,
  onRemoveTab,
  onStartRenameTab,
  pageTabs,
  setActiveTabId,
  setEditingLabel,
  setEditingTabId,
  tabInputRef,
}: {
  activeTabId: string | null;
  editingLabel: string;
  editingTabId: string | null;
  onAddTab: () => void;
  onDisableTabs: () => void;
  onFinishRenameTab: () => void;
  onRemoveTab: (tabId: string) => void;
  onStartRenameTab: (tab: PageTab) => void;
  pageTabs: PageTab[];
  setActiveTabId: (tabId: string | null) => void;
  setEditingLabel: (label: string) => void;
  setEditingTabId: (tabId: string | null) => void;
  tabInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { clearSelection } = useEditorUi();
  const t = useTranslations("editor.pageTabBar");

  return (
    <div
      className="group/tabbar mb-6 flex items-center justify-center gap-2"
      role="presentation"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <div className="opacity-0 transition-opacity group-hover/tabbar:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDisableTabs}
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
          {pageTabs.map((tab, index) => {
            const isEditing = editingTabId === tab.id;
            const canRemove = index >= 2;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="group/tab flex items-center gap-1.5 px-3"
              >
                {isEditing ? (
                  <Input
                    ref={tabInputRef}
                    value={editingLabel}
                    onChange={(event) => setEditingLabel(event.target.value)}
                    onBlur={onFinishRenameTab}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") onFinishRenameTab();
                      if (event.key === "Escape") setEditingTabId(null);
                    }}
                    className="h-5 w-20 border-none px-1 py-0 text-sm shadow-none focus-visible:ring-1"
                    onClick={(event) => event.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="select-none">{tab.label}</span>
                    <div className="hidden items-center gap-0.5 group-hover/tab:flex">
                      <TabIconButton
                        aria-label={t("renameTab")}
                        onClick={(event) => {
                          event.stopPropagation();
                          onStartRenameTab(tab);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onStartRenameTab(tab);
                          }
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </TabIconButton>
                      {canRemove ? (
                        <TabIconButton
                          aria-label={t("removeTab")}
                          destructive
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveTab(tab.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              onRemoveTab(tab.id);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </TabIconButton>
                      ) : null}
                    </div>
                  </>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onAddTab}
        aria-label={t("addTab")}
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>
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
  const sessionTokens = getStoredAccessSessionTokens();
  const rawPage = useQuery(api.pages.get, {
    pageId: pageId as Id<"pages">,
    sessionTokens,
  });
  const rawLayouts = useQuery(api.layouts.list, {
    pageId: pageId as Id<"pages">,
  });
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
  const createLayout = useMutation(api.layouts.create);
  const removeLayout = useMutation(api.layouts.remove);
  const reorderLayouts = useMutation(api.layouts.reorder);
  const updateLayoutSettings = useMutation(api.layouts.updateSettings);
  const updateBlock = useMutation(api.layouts.updateBlockInSlot);
  const removeBlock = useMutation(api.layouts.removeBlockFromSlot);
  const moveBlock = useMutation(api.layouts.moveBlock);
  const updatePageTabs = useMutation(api.pages.updatePageTabs);
  const disablePageTabs = useMutation(api.pages.disablePageTabs);

  const saveLayoutOrder = async (
    draggedIds: string[],
    otherIds: string[],
    oldIndex: number,
    newIndex: number,
  ) => {
    const nextDraggedOrder = arrayMove(draggedIds, oldIndex, newIndex);
    await reorderLayouts({
      pageId: pageId as Id<"pages">,
      layoutIds: [...nextDraggedOrder, ...otherIds] as Id<"layouts">[],
    });
  };

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

    await saveLayoutOrder(mainLayoutIds, sidebarLayoutIds, oldIndex, newIndex);
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

    await saveLayoutOrder(sidebarLayoutIds, mainLayoutIds, oldIndex, newIndex);
  };

  const handleAddLayout = async (type: LayoutType) => {
    const created = await createLayout({
      pageId: pageId as Id<"pages">,
      type,
      tabId: resolvedActiveTabId ?? undefined,
    });

    if (created.firstSlotId) {
      const firstSlotId = created.firstSlotId;
      setTimeout(() => {
        selectSlot(created.layoutId as string, firstSlotId);
        onSelectionChange?.(firstSlotId);
      }, 100);
    }
  };

  const handleRemoveLayout = async (layoutId: string) => {
    await removeLayout({ layoutId: layoutId as Id<"layouts"> });
    clearSelection();
  };

  const handleDisableTabs = async () => {
    await disablePageTabs({ pageId: pageId as Id<"pages"> });
    setActiveTabId(null);
  };

  const handleAddTab = async () => {
    const tab = { id: nanoid(10), label: `Tab ${pageTabs.length + 1}` };
    await updatePageTabs({
      pageId: pageId as Id<"pages">,
      pageTabs: [...pageTabs, tab],
    });
    setActiveTabId(tab.id);
  };

  const handleRemoveTab = async (tabId: string) => {
    if (pageTabs.length <= 2) return;
    const nextTabs = pageTabs.filter((tab) => tab.id !== tabId);
    await updatePageTabs({
      pageId: pageId as Id<"pages">,
      pageTabs: nextTabs,
    });
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
    await updatePageTabs({
      pageId: pageId as Id<"pages">,
      pageTabs: pageTabs.map((tab) =>
        tab.id === editingTabId
          ? { ...tab, label: editingLabel.trim() || tab.label }
          : tab,
      ),
    });
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
        updateBlock({
          layoutId: layout.id as Id<"layouts">,
          slotId,
          blockId,
          content,
        })
      }
      onRemoveBlock={(slotId, blockId) =>
        removeBlock({
          layoutId: layout.id as Id<"layouts">,
          slotId,
          blockId,
        })
      }
      onMoveBlock={(fromSlotId, toSlotId, blockId, toIndex) =>
        moveBlock({
          layoutId: layout.id as Id<"layouts">,
          fromSlotId,
          toSlotId,
          blockId,
          toIndex,
        })
      }
      onRemove={() => handleRemoveLayout(layout.id)}
      onUpdateSettings={(settings) =>
        updateLayoutSettings({
          layoutId: layout.id as Id<"layouts">,
          settings,
        })
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
          <PageTabs
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
