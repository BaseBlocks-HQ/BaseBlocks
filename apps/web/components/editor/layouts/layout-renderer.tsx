"use client";

import { useEditorContextOptional } from "@/components/editor/editor-context";
import { Button } from "@/components/ui/button";
import { SPACER_LAYOUT_HEIGHTS, getLayoutGridStyle } from "@/lib/layouts";
import { cn } from "@/lib/utils";
import type { AnyContent, LayoutData, SpacerLayoutHeight } from "@/types";
import { GripVertical, MoveVertical, Trash2 } from "lucide-react";
import type { HTMLAttributes, Ref } from "react";
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
  // DnD props passed from SortableLayout
  dragHandleRef?: Ref<HTMLDivElement>;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
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
  onUpdateBlock,
  onRemoveBlock,
  onMoveBlock,
  onRemove,
  onUpdateSettings,
  dragHandleRef,
  dragHandleProps,
  isDragging,
}: LayoutRendererProps) {
  const editorCtx = useEditorContextOptional();
  const showControls = editorCtx?.showControls ?? true;
  const gridStyle = getLayoutGridStyle(layout.type, layout.settings);
  const spacerHeight = layout.settings.spacerHeight ?? "medium";

  const handleSpacerHeightChange = (height: SpacerLayoutHeight) => {
    onUpdateSettings?.({ ...layout.settings, spacerHeight: height });
  };

  return (
    <div
      className={cn(
        "group/layout rounded-md transition-colors",
        isDragging && "ring-2 ring-primary/30",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectLayout();
      }}
    >
      {/* Layout with inline toolbar */}
      <div className="flex gap-1 items-start">
        {/* Layout toolbar - inline */}
        {showControls && (
          <div
            className={cn(
              "flex flex-col gap-0.5 shrink-0",
              "transition-opacity",
              selectedBlockId
                ? "opacity-0 pointer-events-none"
                : "opacity-0 group-hover/layout:opacity-100",
              isSelected && !selectedBlockId && "opacity-100",
            )}
          >
            <div
              ref={dragHandleRef}
              role="button"
              tabIndex={0}
              className={cn(
                "flex items-center justify-center h-6 w-6 rounded",
                "cursor-grab active:cursor-grabbing",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
              {...dragHandleProps}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </div>
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
        )}

        {/* Layout content */}
        <div className="min-w-0 flex-1 rounded-md transition-colors hover:bg-muted/20">
          {layout.type === "spacer" ? (
            /* Spacer layout - renders as vertical space with height controls */
            <div
              className={cn(
                "w-full max-w-full box-border",
                "border border-dashed border-muted-foreground/30 rounded-md",
                "flex items-center justify-center gap-2 sm:gap-3",
                "transition-colors",
                "hover:border-muted-foreground/50 hover:bg-muted/30",
              )}
              style={{ height: `${SPACER_LAYOUT_HEIGHTS[spacerHeight]}px` }}
            >
              <MoveVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />

              {/* Height controls - responsive sizing */}
              <div className="flex gap-0.5 sm:gap-1">
                {(
                  Object.keys(SPACER_LAYOUT_HEIGHTS) as SpacerLayoutHeight[]
                ).map((size) => (
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
                ))}
              </div>
            </div>
          ) : (
            /* Regular layouts with slots */
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
    </div>
  );
}
