"use client";

import { DndProvider, type DragEndEvent, arrayMove } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveStatus } from "@/hooks";
import { createSection } from "@/lib/sections";
import { cn } from "@/lib/utils";
import type {
  BlockContent,
  BlockType,
  SectionData,
  SectionLayout,
  SectionSettings,
} from "@/types";
import { api } from "@repo/backend";
import type { Doc, Id } from "@repo/backend";
import { useMutation, useQuery } from "convex/react";
import { Plus } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useEditorContext } from "./editor-context";
import { SaveIndicator } from "./save-indicator";
import { SortableSection } from "./sections/sortable-section";

interface PageEditorProps {
  pageId: string;
  onSelectionChange?: (slotId: string | null) => void;
}

export function PageEditor({ pageId, onSelectionChange }: PageEditorProps) {
  const { selection, selectSection, selectSlot, selectBlock, clearSelection } =
    useEditorContext();
  const { status, setStatus } = useSaveStatus();

  // Queries
  const pageData = useQuery(api.pages.queries.get, {
    pageId: pageId as Id<"pages">,
  });
  const sectionsData = useQuery(api.sections.queries.list, {
    pageId: pageId as Id<"pages">,
  });

  // Mutations
  const createSectionMutation = useMutation(api.sections.mutations.create);
  const reorderSectionsMutation = useMutation(api.sections.mutations.reorder);
  const updateBlockMutation = useMutation(
    api.sections.mutations.updateBlockInSlot
  );
  const removeBlockMutation = useMutation(
    api.sections.mutations.removeBlockFromSlot
  );
  const removeSectionMutation = useMutation(api.sections.mutations.remove);
  const moveBlockMutation = useMutation(api.sections.mutations.moveBlock);
  const updateSettingsMutation = useMutation(
    api.sections.mutations.updateSettings
  );

  // Convert sections from DB to SectionData format
  type SectionDoc = Doc<"sections">;
  type SlotDoc = SectionDoc["slots"][number];
  type BlockDoc = SlotDoc["blocks"][number];
  const sections: SectionData[] = useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map((s: SectionDoc) => ({
      id: s._id,
      type: s.type as SectionLayout,
      order: s.order,
      slots: s.slots.map((slot: SlotDoc) => ({
        id: slot.id,
        position: slot.position,
        blocks: slot.blocks.map((block: BlockDoc) => ({
          id: block.id,
          type: block.type as BlockType,
          content: block.content as BlockContent,
        })),
      })),
      settings: s.settings as SectionSettings,
    }));
  }, [sectionsData]);

  // Separate main sections from sidebar sections
  const mainSections = useMemo(
    () => sections.filter((s) => s.type !== "vertical"),
    [sections]
  );
  const sidebarSections = useMemo(
    () => sections.filter((s) => s.type === "vertical"),
    [sections]
  );
  const hasSidebar = sidebarSections.length > 0;

  // Section IDs for DnD (main sections only for now)
  const mainSectionIds = useMemo(
    () => mainSections.map((s) => s.id),
    [mainSections]
  );
  const sidebarSectionIds = useMemo(
    () => sidebarSections.map((s) => s.id),
    [sidebarSections]
  );

  // Handle section drag end for main sections
  const handleMainSectionDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = mainSectionIds.indexOf(String(active.id));
      const newIndex = mainSectionIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newMainOrder = arrayMove(mainSectionIds, oldIndex, newIndex);
      // Combine with sidebar sections (they come after main sections)
      const newOrder = [...newMainOrder, ...sidebarSectionIds];
      await reorderSectionsMutation({
        pageId: pageId as Id<"pages">,
        sectionIds: newOrder as Id<"sections">[],
      });
    },
    [mainSectionIds, sidebarSectionIds, pageId, reorderSectionsMutation]
  );

  // Handle section drag end for sidebar sections
  const handleSidebarSectionDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sidebarSectionIds.indexOf(String(active.id));
      const newIndex = sidebarSectionIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newSidebarOrder = arrayMove(sidebarSectionIds, oldIndex, newIndex);
      // Combine with main sections (they come before sidebar sections)
      const newOrder = [...mainSectionIds, ...newSidebarOrder];
      await reorderSectionsMutation({
        pageId: pageId as Id<"pages">,
        sectionIds: newOrder as Id<"sections">[],
      });
    },
    [mainSectionIds, sidebarSectionIds, pageId, reorderSectionsMutation]
  );

  // Notify parent of slot selection changes
  const handleSelectSlot = useCallback(
    (sectionId: string, slotId: string) => {
      selectSlot(sectionId, slotId);
      onSelectionChange?.(slotId);
    },
    [selectSlot, onSelectionChange]
  );

  // Add a new section
  const handleAddSection = useCallback(
    async (type: SectionLayout) => {
      const newSection = createSection(type);
      const sectionId = await createSectionMutation({
        pageId: pageId as Id<"pages">,
        type: newSection.type,
        slots: newSection.slots,
        settings: newSection.settings,
      });

      if (newSection.slots.length > 0) {
        setTimeout(() => {
          selectSlot(sectionId as string, newSection.slots[0]!.id);
          onSelectionChange?.(newSection.slots[0]!.id);
        }, 100);
      }
    },
    [createSectionMutation, pageId, selectSlot, onSelectionChange]
  );

  // Update block content
  const handleUpdateBlock = useCallback(
    async (
      sectionId: string,
      slotId: string,
      blockId: string,
      content: BlockContent
    ) => {
      setStatus("saving");
      await updateBlockMutation({
        sectionId: sectionId as Id<"sections">,
        slotId,
        blockId,
        content,
      });
      setStatus("saved");
    },
    [updateBlockMutation, setStatus]
  );

  // Remove block
  const handleRemoveBlock = useCallback(
    async (sectionId: string, slotId: string, blockId: string) => {
      await removeBlockMutation({
        sectionId: sectionId as Id<"sections">,
        slotId,
        blockId,
      });
    },
    [removeBlockMutation]
  );

  // Remove section
  const handleRemoveSection = useCallback(
    async (sectionId: string) => {
      await removeSectionMutation({
        sectionId: sectionId as Id<"sections">,
      });
      clearSelection();
    },
    [removeSectionMutation, clearSelection]
  );

  // Move block within section
  const handleMoveBlock = useCallback(
    async (
      sectionId: string,
      fromSlotId: string,
      toSlotId: string,
      blockId: string,
      toIndex: number
    ) => {
      await moveBlockMutation({
        sectionId: sectionId as Id<"sections">,
        fromSlotId,
        toSlotId,
        blockId,
        toIndex,
      });
    },
    [moveBlockMutation]
  );

  // Update section settings (e.g., spacer height)
  const handleUpdateSettings = useCallback(
    async (sectionId: string, settings: SectionSettings) => {
      setStatus("saving");
      await updateSettingsMutation({
        sectionId: sectionId as Id<"sections">,
        settings,
      });
      setStatus("saved");
    },
    [updateSettingsMutation, setStatus]
  );

  // Handle click on editor background to deselect
  // Sections/blocks call stopPropagation(), so this only fires for background clicks
  const handleEditorClick = useCallback(() => {
    clearSelection();
    onSelectionChange?.(null);
  }, [clearSelection, onSelectionChange]);

  // Render a section with all its props
  const renderSection = (section: SectionData) => (
    <SortableSection
      key={section.id}
      section={section}
      isSelected={selection.sectionId === section.id}
      selectedSlotId={
        selection.sectionId === section.id ? selection.slotId : null
      }
      selectedBlockId={
        selection.sectionId === section.id ? selection.blockId : null
      }
      onSelectSection={() => selectSection(section.id)}
      onSelectSlot={(slotId) => handleSelectSlot(section.id, slotId)}
      onSelectBlock={(slotId, blockId) =>
        selectBlock(section.id, slotId, blockId)
      }
      onAddBlock={(slotId) => handleSelectSlot(section.id, slotId)}
      onUpdateBlock={(slotId, blockId, content) =>
        handleUpdateBlock(section.id, slotId, blockId, content)
      }
      onRemoveBlock={(slotId, blockId) =>
        handleRemoveBlock(section.id, slotId, blockId)
      }
      onMoveBlock={(fromSlotId, toSlotId, blockId, toIndex) =>
        handleMoveBlock(section.id, fromSlotId, toSlotId, blockId, toIndex)
      }
      onRemove={() => handleRemoveSection(section.id)}
      onUpdateSettings={(settings) => handleUpdateSettings(section.id, settings)}
    />
  );

  if (pageData === undefined || sectionsData === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  return (
    <div className="min-h-full w-full" onClick={handleEditorClick}>
      <div className={cn("mx-auto relative", hasSidebar ? "max-w-6xl" : "max-w-4xl")}>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{pageData.title}</h1>
          <SaveIndicator status={status} />
        </div>

        {hasSidebar ? (
          // Layout with sidebar
          <div className="flex gap-6 pb-32">
            {/* Main content area */}
            <div className="flex-1 min-w-0 space-y-3 pl-10">
              {mainSections.length > 0 ? (
                <DndProvider
                  items={mainSectionIds}
                  onDragEnd={handleMainSectionDragEnd}
                >
                  {mainSections.map((section) => renderSection(section))}
                </DndProvider>
              ) : (
                <div
                  className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-muted-foreground text-sm mb-3">
                    Add a section to main content
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSection("single")}
                    >
                      <Plus className="h-3 w-3 mr-1.5" />
                      Single
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddSection("columns")}
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
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                Sidebar
              </div>
              <DndProvider
                items={sidebarSectionIds}
                onDragEnd={handleSidebarSectionDragEnd}
              >
                {sidebarSections.map((section) => renderSection(section))}
              </DndProvider>
            </aside>
          </div>
        ) : (
          // Standard layout without sidebar
          <div className="space-y-3 pb-32 pl-10">
            {sections.length > 0 ? (
              <DndProvider
                items={mainSectionIds}
                onDragEnd={handleMainSectionDragEnd}
              >
                {sections.map((section) => renderSection(section))}
              </DndProvider>
            ) : (
              <div
                className="text-center py-12 border border-dashed rounded-lg bg-muted/20"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-muted-foreground text-sm mb-3">
                  Add a section to get started
                </p>
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSection("single")}
                  >
                    <Plus className="h-3 w-3 mr-1.5" />
                    Single
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSection("columns")}
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
