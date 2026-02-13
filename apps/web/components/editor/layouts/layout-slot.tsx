"use client";

import { DndProvider, type DragEndEvent } from "@/components/dnd";
import {
  ElementEditorWrapper,
  LayoutContextProvider,
} from "@/components/elements";
import {
  getElementConfigPanel,
  hasElementConfigPanel,
} from "@/components/elements/registry";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  AnyContent,
  ElementType,
  LayoutSlot as LayoutSlotType,
  LayoutType,
} from "@/types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Settings2, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface LayoutSlotProps {
  slot: LayoutSlotType;
  layoutId: string;
  layoutType: LayoutType;
  isSelected: boolean;
  selectedBlockId: string | null;
  onSelect: () => void;
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onUpdateBlock: (blockId: string, content: AnyContent) => void;
  onRemoveBlock: (blockId: string) => void;
  onMoveBlock?: (toSlotId: string, blockId: string, toIndex: number) => void;
}

export function LayoutSlot({
  slot,
  layoutId,
  layoutType,
  isSelected,
  selectedBlockId,
  onSelect,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
}: LayoutSlotProps) {
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
        "min-h-[48px] rounded",
        // Empty state only - dashed border
        isEmpty && "border border-dashed transition-colors",
        isEmpty && isSelected
          ? "border-primary/50 bg-primary/5"
          : isEmpty &&
              "border-muted-foreground/20 hover:border-muted-foreground/30",
        // Non-empty state - no wrapper backgrounds, let blocks handle their own styling
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
        <div className="p-1">
          <DndProvider items={blockIds} onDragEnd={handleBlockDragEnd}>
            {slot.blocks.map((block) => (
              <SortableBlock
                key={block.id}
                id={block.id}
                block={block}
                layoutType={layoutType}
                layoutId={layoutId}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onUpdate={(content) => onUpdateBlock(block.id, content)}
                onRemove={() => onRemoveBlock(block.id)}
              />
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
  block: {
    id: string;
    type: string;
    content: AnyContent;
  };
  layoutType: LayoutType;
  layoutId: string;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: AnyContent) => void;
  onRemove: () => void;
}

function SortableBlock({
  id,
  block,
  layoutType,
  layoutId,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
}: SortableBlockProps) {
  const [configOpen, setConfigOpen] = useState(false);
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

  const blockType = block.type as ElementType;
  const hasConfig = hasElementConfigPanel(blockType);
  const ConfigPanel = hasConfig ? getElementConfigPanel(blockType) : null;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[40px] rounded border border-dashed border-primary/40 bg-primary/5 mb-2"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/block mb-3 min-w-0"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Block with inline toolbar */}
      <div className="flex gap-1 items-start">
        {/* Block toolbar - inline, inside layout */}
        <div
          className={cn(
            "flex flex-col gap-0.5 shrink-0",
            "transition-opacity",
            "opacity-0 group-hover/block:opacity-100",
            isSelected && "opacity-100",
          )}
        >
          <div
            ref={setActivatorNodeRef}
            className={cn(
              "flex items-center justify-center h-6 w-6 rounded",
              "cursor-grab active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          {hasConfig && ConfigPanel && (
            <Popover open={configOpen} onOpenChange={setConfigOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="left"
                align="start"
                className="w-64"
                onClick={(e) => e.stopPropagation()}
                onPointerDownOutside={(e) => {
                  // Prevent popover close when interacting with portaled Select dropdown
                  const target = e.target as HTMLElement;
                  if (target.closest('[data-slot="select-content"]')) {
                    e.preventDefault();
                  }
                }}
              >
                <ConfigPanel content={block.content} onUpdate={onUpdate} />
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Block content */}
        <div className="min-w-0 flex-1">
          <LayoutContextProvider layoutType={layoutType} layoutId={layoutId}>
            <ElementEditorWrapper
              id={block.id}
              type={block.type as ElementType}
              content={block.content}
              isSelected={isSelected}
              onUpdate={onUpdate}
              onRemove={onRemove}
            />
          </LayoutContextProvider>
        </div>
      </div>
    </div>
  );
}
