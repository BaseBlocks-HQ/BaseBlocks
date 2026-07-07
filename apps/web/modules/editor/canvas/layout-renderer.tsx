"use client";

import {
  SPACER_LAYOUT_HEIGHTS,
  getLayoutGridStyle,
} from "@/modules/editor/layout";
import type {
  AnyContent,
  LayoutData,
  SpacerLayoutHeight,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { GripVertical, MoveVertical, Trash2 } from "lucide-react";
import { type ButtonHTMLAttributes, type Ref, useState } from "react";
import { getEditorLayoutSurfaceClassName } from "./editor-chrome";
import {
  editorControlRowClassName,
  editorControlZoneStyle,
} from "./editor-spacing";
import { LayoutSlot } from "./layout-slot";

export interface LayoutRendererProps {
  layout: LayoutData;
  isSelected: boolean;
  selectedSlotId: string | null;
  selectedBlockId: string | null;
  onSelectLayout: () => void;
  onSelectSlot: (slotId: string) => void;
  onSelectBlock: (slotId: string, blockId: string) => void;
  onAddBlock: (slotId: string) => void;
  onPasteBlock?: (slotId: string) => void;
  onUpdateBlock: (slotId: string, blockId: string, content: AnyContent) => void;
  onRemoveBlock: (slotId: string, blockId: string) => void;
  onMoveBlock?: (
    fromSlotId: string,
    toSlotId: string,
    blockId: string,
    toIndex: number,
  ) => void;
  onRemove: () => void;
  onUpdateSettings?: (settings: LayoutData["settings"]) => void;
  dragHandleRef?: Ref<HTMLButtonElement>;
  dragHandleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
}

export function LayoutRenderer({
  layout,
  isSelected,
  selectedSlotId,
  selectedBlockId,
  onSelectLayout,
  onSelectSlot,
  onSelectBlock,
  onAddBlock,
  onPasteBlock,
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
  onRemove,
  onUpdateSettings,
  dragHandleRef,
  dragHandleProps,
  isDragging,
}: LayoutRendererProps) {
  const [isHovered, setIsHovered] = useState(false);
  const gridStyle = getLayoutGridStyle(layout.type, layout.settings);
  const spacerHeight = layout.settings.spacerHeight ?? "medium";
  const hasSelectedChild = selectedSlotId !== null;

  const showControls = !selectedBlockId && (isHovered || isSelected);

  const handleSpacerHeightChange = (height: SpacerLayoutHeight) => {
    onUpdateSettings?.({ ...layout.settings, spacerHeight: height });
  };

  return (
    <div
      role="presentation"
      style={editorControlZoneStyle}
      className={cn(
        "relative rounded-md transition-colors",
        isDragging && "ring-2 ring-primary/30",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onSelectLayout();
      }}
    >
      {/* Controls live in the reserved top zone — content never shifts. */}
      {showControls && (
        <div className={editorControlRowClassName}>
          <button
            ref={dragHandleRef}
            type="button"
            className={cn(
              "flex items-center justify-center h-6 w-6 rounded",
              "cursor-grab active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            {...dragHandleProps}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          {isSelected && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      <div
        className={getEditorLayoutSurfaceClassName({
          isHovered,
          isSelected,
          hasSelectedChild,
        })}
      >
        {layout.type === "spacer" ? (
          <div
            className={cn(
              "w-full max-w-full box-border",
              "border border-dashed border-muted-foreground/30 rounded-md",
              "flex items-center justify-center gap-2 sm:gap-3",
              "transition-colors",
              "hover:border-muted-foreground/50",
            )}
            style={{ height: `${SPACER_LAYOUT_HEIGHTS[spacerHeight]}px` }}
          >
            <MoveVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <div className="flex gap-0.5 sm:gap-1">
              {(Object.keys(SPACER_LAYOUT_HEIGHTS) as SpacerLayoutHeight[]).map(
                (size) => (
                  <Button
                    key={size}
                    variant={spacerHeight === size ? "default" : "outline"}
                    size="sm"
                    className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-[10px] sm:text-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSpacerHeightChange(size);
                    }}
                  >
                    {size === "small"
                      ? "S"
                      : size === "medium"
                        ? "M"
                        : size === "large"
                          ? "L"
                          : "XL"}
                  </Button>
                ),
              )}
            </div>
          </div>
        ) : (
          <div style={gridStyle} className="min-h-[48px] p-2">
            {layout.slots.map((slot) => (
              <LayoutSlot
                key={slot.id}
                slot={slot}
                layoutId={layout.id}
                layoutType={layout.type}
                isSelected={selectedSlotId === slot.id}
                selectedBlockId={
                  selectedSlotId === slot.id ? selectedBlockId : null
                }
                onSelect={() => onSelectSlot(slot.id)}
                onSelectBlock={(blockId) => onSelectBlock(slot.id, blockId)}
                onAddBlock={() => onAddBlock(slot.id)}
                onPasteBlock={
                  onPasteBlock ? () => onPasteBlock(slot.id) : undefined
                }
                onUpdateBlock={(blockId, content) =>
                  onUpdateBlock(slot.id, blockId, content)
                }
                onRemoveBlock={(blockId) => onRemoveBlock(slot.id, blockId)}
                onMoveBlock={
                  onMoveBlock
                    ? (toSlotId, blockId, toIndex) =>
                        onMoveBlock(slot.id, toSlotId, blockId, toIndex)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
