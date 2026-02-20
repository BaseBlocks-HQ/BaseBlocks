"use client";

import { DndProvider, type DragEndEvent, arrayMove } from "../dnd";
// Inline loading placeholder (no dependency on app-level skeletons)
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
import type {
  AnyContent,
  LayoutBlockType,
  LayoutData,
  LayoutSettings,
  LayoutType,
} from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { cn } from "@baseblocks/ui/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@baseblocks/ui/tabs";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorContext } from "../contexts/editor-context";
import { useEditorMutations } from "../contexts/editor-mutations";
import { createLayout, generateId } from "../layouts";
import type { LayoutDoc, PageData } from "../types";
import { SortableLayout } from "./layouts/sortable-layout";

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
    pushCommand,
    isUndoRedoExecuting,
    setCurrentPageId,
    showControls,
  } = useEditorContext();

  const { layouts: layoutMutations, pages: pageMutations } =
    useEditorMutations();

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

  // Tab rename state
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const tabInputRef = useRef<HTMLInputElement>(null);

  // Track last known block content for undo
  const lastKnownContentRef = useRef<Map<string, AnyContent>>(new Map());

  // Seed content ref from query data
  useEffect(() => {
    if (!layoutsData) return;
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
  }, [layoutsData]);

  // Page tabs
  const pageTabs = useMemo(() => pageData?.pageTabs ?? [], [pageData]);
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
  const allLayouts: LayoutData[] = useMemo(() => {
    if (!layoutsData) return [];
    return layoutsData.map((s) => ({
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

      const oldMainOrder = [...mainLayoutIds];
      const newMainOrder = arrayMove(mainLayoutIds, oldIndex, newIndex);
      const newOrder = [...newMainOrder, ...sidebarLayoutIds];
      await layoutMutations.reorder({
        pageId,
        layoutIds: newOrder,
      });

      if (!isUndoRedoExecuting) {
        const oldOrder = [...oldMainOrder, ...sidebarLayoutIds];
        pushCommand({
          description: "Reorder layouts",
          pageId,
          undo: async () => {
            await layoutMutations.reorder({
              pageId,
              layoutIds: oldOrder,
            });
          },
          redo: async () => {
            await layoutMutations.reorder({
              pageId,
              layoutIds: newOrder,
            });
          },
        });
      }
    },
    [
      mainLayoutIds,
      sidebarLayoutIds,
      pageId,
      layoutMutations,
      pushCommand,
      isUndoRedoExecuting,
    ],
  );

  // Handle layout drag end for sidebar layouts
  const handleSidebarLayoutDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sidebarLayoutIds.indexOf(String(active.id));
      const newIndex = sidebarLayoutIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const oldSidebarOrder = [...sidebarLayoutIds];
      const newSidebarOrder = arrayMove(sidebarLayoutIds, oldIndex, newIndex);
      const newOrder = [...mainLayoutIds, ...newSidebarOrder];
      await layoutMutations.reorder({
        pageId,
        layoutIds: newOrder,
      });

      if (!isUndoRedoExecuting) {
        const oldOrder = [...mainLayoutIds, ...oldSidebarOrder];
        pushCommand({
          description: "Reorder sidebar layouts",
          pageId,
          undo: async () => {
            await layoutMutations.reorder({
              pageId,
              layoutIds: oldOrder,
            });
          },
          redo: async () => {
            await layoutMutations.reorder({
              pageId,
              layoutIds: newOrder,
            });
          },
        });
      }
    },
    [
      mainLayoutIds,
      sidebarLayoutIds,
      pageId,
      layoutMutations,
      pushCommand,
      isUndoRedoExecuting,
    ],
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
            await layoutMutations.remove({
              layoutId: layoutIdRef.value,
            });
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
    },
    [
      layoutMutations,
      pageId,
      activeTabId,
      selectSlot,
      onSelectionChange,
      pushCommand,
      clearSelection,
      isUndoRedoExecuting,
    ],
  );

  // Update block content
  const handleUpdateBlock = useCallback(
    async (
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

      // Update ref to new content
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
    },
    [layoutMutations, pushCommand, pageId, isUndoRedoExecuting],
  );

  // Remove block
  const handleRemoveBlock = useCallback(
    async (layoutId: string, slotId: string, blockId: string) => {
      // Snapshot the block before removing
      const layout = allLayouts.find((l) => l.id === layoutId);
      const slot = layout?.slots.find((s) => s.id === slotId);
      const blockIndex = slot?.blocks.findIndex((b) => b.id === blockId) ?? -1;
      const block = slot?.blocks[blockIndex];

      await layoutMutations.removeBlockFromSlot({
        layoutId,
        slotId,
        blockId,
      });

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
    },
    [layoutMutations, allLayouts, pushCommand, pageId, isUndoRedoExecuting],
  );

  // Remove layout
  const handleRemoveLayout = useCallback(
    async (layoutId: string) => {
      // Snapshot layout before removing
      const layout = allLayouts.find((l) => l.id === layoutId);

      await layoutMutations.remove({
        layoutId,
      });
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
            await layoutMutations.remove({
              layoutId: layoutIdRef.value,
            });
            clearSelection();
          },
        });
      }
    },
    [
      layoutMutations,
      clearSelection,
      allLayouts,
      pushCommand,
      pageId,
      isUndoRedoExecuting,
    ],
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
      // Capture the original index before the move
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
    },
    [layoutMutations, allLayouts, pushCommand, pageId, isUndoRedoExecuting],
  );

  // Update layout settings
  const handleUpdateSettings = useCallback(
    async (layoutId: string, settings: LayoutSettings) => {
      const layout = allLayouts.find((l) => l.id === layoutId);
      const oldSettings = layout ? structuredClone(layout.settings) : null;

      await layoutMutations.updateSettings({
        layoutId,
        settings,
      });

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
    },
    [layoutMutations, allLayouts, pushCommand, pageId, isUndoRedoExecuting],
  );

  // === Page tab management ===
  const handleDisableTabs = useCallback(async () => {
    const oldTabs = structuredClone(pageTabs);

    await pageMutations.disablePageTabs({
      pageId,
    });
    setActiveTabId(null);

    if (!isUndoRedoExecuting && oldTabs.length > 0) {
      pushCommand({
        description: "Disable page tabs",
        pageId,
        undo: async () => {
          await pageMutations.enablePageTabs({
            pageId,
            tabs: oldTabs,
          });
        },
        redo: async () => {
          await pageMutations.disablePageTabs({
            pageId,
          });
          setActiveTabId(null);
        },
      });
    }
  }, [
    pageId,
    pageTabs,
    pageMutations,
    pushCommand,
    isUndoRedoExecuting,
    setActiveTabId,
  ]);

  const handleAddTab = useCallback(async () => {
    const oldTabs = structuredClone(pageTabs);
    const newTab = { id: generateId(), label: `Tab ${pageTabs.length + 1}` };
    const newTabs = [...pageTabs, newTab];

    await pageMutations.updatePageTabs({
      pageId,
      pageTabs: newTabs,
    });
    setActiveTabId(newTab.id);

    if (!isUndoRedoExecuting) {
      pushCommand({
        description: "Add tab",
        pageId,
        undo: async () => {
          await pageMutations.updatePageTabs({
            pageId,
            pageTabs: oldTabs,
          });
        },
        redo: async () => {
          await pageMutations.updatePageTabs({
            pageId,
            pageTabs: newTabs,
          });
          setActiveTabId(newTab.id);
        },
      });
    }
  }, [
    pageId,
    pageTabs,
    pageMutations,
    pushCommand,
    isUndoRedoExecuting,
    setActiveTabId,
  ]);

  const handleRemoveTab = useCallback(
    async (tabId: string) => {
      if (pageTabs.length <= 2) return;
      const oldTabs = structuredClone(pageTabs);
      const newTabs = pageTabs.filter((t) => t.id !== tabId);

      await pageMutations.updatePageTabs({
        pageId,
        pageTabs: newTabs,
      });
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0]?.id ?? null);
      }

      if (!isUndoRedoExecuting) {
        pushCommand({
          description: "Remove tab",
          pageId,
          undo: async () => {
            await pageMutations.updatePageTabs({
              pageId,
              pageTabs: oldTabs,
            });
          },
          redo: async () => {
            await pageMutations.updatePageTabs({
              pageId,
              pageTabs: newTabs,
            });
          },
        });
      }
    },
    [
      pageId,
      pageTabs,
      activeTabId,
      pageMutations,
      pushCommand,
      isUndoRedoExecuting,
      setActiveTabId,
    ],
  );

  const handleStartRenameTab = useCallback(
    (tab: { id: string; label: string }) => {
      setEditingTabId(tab.id);
      setEditingLabel(tab.label);
      setTimeout(() => tabInputRef.current?.select(), 0);
    },
    [],
  );

  const handleFinishRenameTab = useCallback(async () => {
    if (!editingTabId) return;
    const oldTabs = structuredClone(pageTabs);
    const newTabs = pageTabs.map((t) =>
      t.id === editingTabId
        ? { ...t, label: editingLabel.trim() || t.label }
        : t,
    );
    await pageMutations.updatePageTabs({
      pageId,
      pageTabs: newTabs,
    });
    setEditingTabId(null);

    if (!isUndoRedoExecuting) {
      pushCommand({
        description: "Rename tab",
        pageId,
        undo: async () => {
          await pageMutations.updatePageTabs({
            pageId,
            pageTabs: oldTabs,
          });
        },
        redo: async () => {
          await pageMutations.updatePageTabs({
            pageId,
            pageTabs: newTabs,
          });
        },
      });
    }
  }, [
    editingTabId,
    editingLabel,
    pageTabs,
    pageId,
    pageMutations,
    pushCommand,
    isUndoRedoExecuting,
  ]);

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
    return <ContentSkeleton />;
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
        {!nested && (
          <h1 className="text-2xl font-semibold mb-6">{pageData.title}</h1>
        )}

        {/* Page-level tab bar */}
        {hasTabs && (
          <div
            className="group/tabbar mb-6 flex items-center justify-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Delete tabs control - follows layout controls pattern */}
            {showControls && (
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
            )}

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
                      <span className="select-none">{tab.label}</span>
                    )}
                    {showControls && (
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
                    )}
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
