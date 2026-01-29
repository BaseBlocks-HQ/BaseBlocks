"use client";

import { BlockEditorWrapper } from "@/components/blocks";
import { DndProvider, type DragEndEvent } from "@/components/dnd";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  BlockContent,
  SectionLayout,
  SectionSlot as SectionSlotType,
} from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";

interface SectionSlotProps {
  slot: SectionSlotType;
  sectionId: string;
  sectionType: SectionLayout;
  isSelected: boolean;
  selectedBlockId: string | null;
  onSelect: () => void;
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onUpdateBlock: (blockId: string, content: BlockContent) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock?: (toSlotId: string, blockId: string, toIndex: number) => void;
}

export function SectionSlot({
  slot,
  sectionId,
  sectionType,
  isSelected,
  selectedBlockId,
  onSelect,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
}: SectionSlotProps) {
  const isEmpty = slot.blocks.length === 0;
  const blockIds = useMemo(() => slot.blocks.map((b) => b.id), [slot.blocks]);

  // Handle block reorder within this slot
  const handleBlockDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blockIds.indexOf(String(active.id));
      const newIndex = blockIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      // Move within same slot
      onMoveBlock?.(slot.id, String(active.id), newIndex);
    },
    [blockIds, slot.id, onMoveBlock],
  );

  return (
    <div
      className={cn(
        "min-h-[48px] rounded transition-colors",
        // Empty state - dashed border
        isEmpty && "border border-dashed",
        isEmpty && isSelected
          ? "border-primary/50 bg-primary/5"
          : isEmpty &&
              "border-muted-foreground/20 hover:border-muted-foreground/30",
        // Non-empty state - subtle background on selection
        !isEmpty && isSelected && "bg-accent/30",
        !isEmpty && !isSelected && "hover:bg-accent/10",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {isEmpty ? (
        // Empty slot
        <button
          type="button"
          className="flex items-center justify-center w-full h-full min-h-[48px] text-muted-foreground text-xs gap-1 hover:text-foreground transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onAddBlock();
          }}
        >
          <Plus className="h-3 w-3" />
          Add block
        </button>
      ) : (
        // Slot with blocks
        <div className="p-1.5">
          <DndProvider items={blockIds} onDragEnd={handleBlockDragEnd}>
            {slot.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                id={block.id}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onRemove={() => onRemoveBlock(block.id)}
              >
                <BlockEditorWrapper
                  block={{
                    _id: block.id,
                    type: block.type,
                    content: block.content as BlockContent,
                  }}
                  onUpdate={(content) =>
                    onUpdateBlock(block.id, content as BlockContent)
                  }
                  onRemove={() => onRemoveBlock(block.id)}
                />
              </SortableBlock>
            ))}
          </DndProvider>

          {/* Add block button - minimal */}
          <button
            type="button"
            className={cn(
              "w-full py-1 mt-1 text-xs text-muted-foreground",
              "flex items-center justify-center gap-1",
              "rounded border border-dashed border-transparent",
              "hover:border-muted-foreground/30 hover:text-foreground transition-colors",
            )}
            onClick={(e) => {
              e.stopPropagation();
              onAddBlock();
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// Sortable block wrapper - internal component
interface SortableBlockProps {
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}

function SortableBlock({
  id,
  isSelected,
  onSelect,
  onRemove,
  children,
}: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[40px] rounded border border-dashed border-primary/40 bg-primary/5 mb-1"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/block relative mb-1 rounded transition-colors",
        isSelected
          ? "bg-accent/50 ring-1 ring-primary/30"
          : "hover:bg-accent/20",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Block toolbar - appears on hover, compact */}
      <div
        className={cn(
          "absolute -left-7 top-0.5 flex flex-col gap-px",
          "opacity-0 group-hover/block:opacity-100 transition-opacity",
        )}
      >
        <div
          ref={setActivatorNodeRef}
          className={cn(
            "flex items-center justify-center h-5 w-5 rounded",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "cursor-grab active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3 w-3" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Block content */}
      <div className="pl-1">{children}</div>
    </div>
  );
}
