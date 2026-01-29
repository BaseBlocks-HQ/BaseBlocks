"use client";

import { DndProvider, type DragEndEvent, arrayMove } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveStatus } from "@/hooks";
import { createSection } from "@/lib/sections";
import type {
  BlockContent,
  BlockType,
  SectionData,
  SectionLayout,
  SectionSettings,
} from "@/types";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
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
    api.sections.mutations.updateBlockInSlot,
  );
  const removeBlockMutation = useMutation(
    api.sections.mutations.removeBlockFromSlot,
  );
  const removeSectionMutation = useMutation(api.sections.mutations.remove);
  const moveBlockMutation = useMutation(api.sections.mutations.moveBlock);

  // Convert sections from DB to SectionData format
  const sections: SectionData[] = useMemo(() => {
    if (!sectionsData) return [];
    return sectionsData.map((s) => ({
      id: s._id,
      type: s.type as SectionLayout,
      order: s.order,
      slots: s.slots.map((slot) => ({
        id: slot.id,
        position: slot.position,
        blocks: slot.blocks.map((block) => ({
          id: block.id,
          type: block.type as BlockType,
          content: block.content as BlockContent,
        })),
      })),
      settings: s.settings as SectionSettings,
    }));
  }, [sectionsData]);

  // Section IDs for DnD
  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);

  // Handle section drag end
  const handleSectionDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sectionIds.indexOf(String(active.id));
      const newIndex = sectionIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(sectionIds, oldIndex, newIndex);
      await reorderSectionsMutation({
        pageId: pageId as Id<"pages">,
        sectionIds: newOrder as Id<"sections">[],
      });
    },
    [sectionIds, pageId, reorderSectionsMutation],
  );

  // Notify parent of slot selection changes
  const handleSelectSlot = useCallback(
    (sectionId: string, slotId: string) => {
      selectSlot(sectionId, slotId);
      onSelectionChange?.(slotId);
    },
    [selectSlot, onSelectionChange],
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
    [createSectionMutation, pageId, selectSlot, onSelectionChange],
  );

  // Update block content
  const handleUpdateBlock = useCallback(
    async (
      sectionId: string,
      slotId: string,
      blockId: string,
      content: BlockContent,
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
    [updateBlockMutation, setStatus],
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
    [removeBlockMutation],
  );

  // Remove section
  const handleRemoveSection = useCallback(
    async (sectionId: string) => {
      await removeSectionMutation({
        sectionId: sectionId as Id<"sections">,
      });
      clearSelection();
    },
    [removeSectionMutation, clearSelection],
  );

  // Move block within section
  const handleMoveBlock = useCallback(
    async (
      sectionId: string,
      fromSlotId: string,
      toSlotId: string,
      blockId: string,
      toIndex: number,
    ) => {
      await moveBlockMutation({
        sectionId: sectionId as Id<"sections">,
        fromSlotId,
        toSlotId,
        blockId,
        toIndex,
      });
    },
    [moveBlockMutation],
  );

  // Handle click on editor background to deselect
  // Sections/blocks call stopPropagation(), so this only fires for background clicks
  const handleEditorClick = useCallback(() => {
    clearSelection();
    onSelectionChange?.(null);
  }, [clearSelection, onSelectionChange]);

  if (pageData === undefined || sectionsData === undefined) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!pageData) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  return (
    <div className="min-h-full w-full" onClick={handleEditorClick}>
      <div className="max-w-4xl mx-auto relative">
        <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">{pageData.title}</h1>
        <SaveIndicator status={status} />
      </div>

      <div className="space-y-3 pb-32">
        {sections.length > 0 ? (
          <DndProvider items={sectionIds} onDragEnd={handleSectionDragEnd}>
            {sections.map((section) => (
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
                  handleMoveBlock(
                    section.id,
                    fromSlotId,
                    toSlotId,
                    blockId,
                    toIndex,
                  )
                }
                onRemove={() => handleRemoveSection(section.id)}
              />
            ))}
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
      </div>
    </div>
  );
}

export { PageEditor as default };
