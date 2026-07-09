"use client";

import { useEditorSiteOptional } from "@/modules/editor/editor-state";
import type {
  AnyContent,
  LayoutSlot as LayoutSlotType,
  LayoutType,
} from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SortableBlock } from "./block-editor";

const editorBlockStackClassName = "flex flex-col gap-2";
const editorSlotActionRowClassName = "flex gap-2 pt-2";
const editorSlotActionButtonClassName =
  "flex flex-1 items-center justify-center gap-1 rounded border border-dashed border-transparent px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-muted-foreground/30 hover:text-foreground min-h-8";

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

function SortableBlockGroup({
  children,
  items,
  onDragEnd,
}: {
  children: ReactNode;
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
  const t = useTranslations("editor.layoutSlot");
  const isEmpty = slot.blocks.length === 0;
  const blockIds = slot.blocks.map((b) => b.id);
  const editorSite = useEditorSiteOptional();
  const canEdit = editorSite?.canEdit ?? true;

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blockIds.indexOf(String(active.id));
    const newIndex = blockIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    // Move within same slot
    onMoveBlock?.(slot.id, String(active.id), newIndex);
  };

  return (
    <div
      role="presentation"
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
      onMouseDown={(e) => {
        if (e.button !== 0) {
          return;
        }
        e.stopPropagation();
        onSelect();
      }}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center gap-2 w-full min-h-[48px] px-3">
          <button
            type="button"
            className="flex items-center justify-center h-full min-h-[48px] text-muted-foreground text-xs gap-1 hover:text-foreground transition-colors"
            disabled={!canEdit}
            onClick={(e) => {
              e.stopPropagation();
              onAddBlock();
            }}
          >
            <Plus className="h-3 w-3" />
            {t("addBlock")}
          </button>
        </div>
      ) : (
        <div className={editorBlockStackClassName}>
          <SortableBlockGroup items={blockIds} onDragEnd={handleBlockDragEnd}>
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
          </SortableBlockGroup>

          <div className={editorSlotActionRowClassName}>
            <button
              type="button"
              className={editorSlotActionButtonClassName}
              disabled={!canEdit}
              onClick={(e) => {
                e.stopPropagation();
                onAddBlock();
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
