"use client";

import { useBlockClipboardOptional } from "@/modules/editor/contexts/block-clipboard-context";
import { canPasteCopiedBlock } from "@/modules/editor/lib/block-clipboard";
import { useEditorSiteOptional } from "@/modules/shared/contexts/editor-context";
import { DndProvider, type DragEndEvent } from "@/modules/shared/dnd";
import type {
  AnyContent,
  LayoutSlot as LayoutSlotType,
  LayoutType,
} from "@baseblocks/types";
import { cn } from "@baseblocks/ui/lib/utils";
import { ClipboardPaste, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  editorBlockStackClassName,
  editorSlotActionButtonClassName,
  editorSlotActionRowClassName,
} from "./editor-spacing";
import { SortableBlock } from "./sortable-block";

interface LayoutSlotProps {
  slot: LayoutSlotType;
  layoutId: string;
  layoutType: LayoutType;
  isSelected: boolean;
  selectedBlockId: string | null;
  onSelect: () => void;
  onSelectBlock: (blockId: string) => void;
  onAddBlock: () => void;
  onPasteBlock?: () => void;
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
  onPasteBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
}: LayoutSlotProps) {
  const t = useTranslations("editor.layoutSlot");
  const isEmpty = slot.blocks.length === 0;
  const blockIds = slot.blocks.map((b) => b.id);
  const editorSite = useEditorSiteOptional();
  const clipboard = useBlockClipboardOptional();
  const canEdit = editorSite?.canEdit ?? true;
  const copiedBlock = clipboard?.copiedBlock ?? null;
  const canPasteBlock =
    canEdit && canPasteCopiedBlock(copiedBlock) && !!onPasteBlock;

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
            onClick={(e) => {
              e.stopPropagation();
              onAddBlock();
            }}
          >
            <Plus className="h-3 w-3" />
            {t("addBlock")}
          </button>
          {canPasteBlock && (
            <button
              type="button"
              className="flex items-center justify-center h-full min-h-[48px] text-muted-foreground text-xs gap-1 hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onPasteBlock?.();
              }}
            >
              <ClipboardPaste className="h-3 w-3" />
              {t("pasteBlock")}
            </button>
          )}
        </div>
      ) : (
        <div className={editorBlockStackClassName}>
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

          <div className={editorSlotActionRowClassName}>
            <button
              type="button"
              className={editorSlotActionButtonClassName}
              onClick={(e) => {
                e.stopPropagation();
                onAddBlock();
              }}
            >
              <Plus className="h-3 w-3" />
            </button>
            {canPasteBlock && (
              <button
                type="button"
                className={editorSlotActionButtonClassName}
                onClick={(e) => {
                  e.stopPropagation();
                  onPasteBlock?.();
                }}
              >
                <ClipboardPaste className="h-3 w-3" />
                {t("paste")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
