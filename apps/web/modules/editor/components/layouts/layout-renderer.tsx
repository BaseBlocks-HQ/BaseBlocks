"use client";

import { useEditorUiOptional } from "@/modules/shared/contexts/editor-context";
import {
  SPACER_LAYOUT_HEIGHTS,
  getLayoutGridStyle,
} from "@/modules/shared/layouts";
import type {
  AnyContent,
  LayoutData,
  SpacerLayoutHeight,
} from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { GripVertical, MoveVertical, Trash2 } from "lucide-react";
import {
  type ButtonHTMLAttributes,
  type MouseEvent,
  type PointerEvent,
  type Ref,
  useRef,
  useState,
} from "react";
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const editorCtx = useEditorUiOptional();
  const showControls = editorCtx?.showControls ?? true;
  const gridStyle = getLayoutGridStyle(layout.type, layout.settings);
  const spacerHeight = layout.settings.spacerHeight ?? "medium";
  const showActions = isSelected && actionsOpen;

  const handleSpacerHeightChange = (height: SpacerLayoutHeight) => {
    onUpdateSettings?.({ ...layout.settings, spacerHeight: height });
  };

  const handlePointerDownCapture = (e: PointerEvent<HTMLButtonElement>) => {
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    suppressClickRef.current = false;
  };

  const handlePointerMoveCapture = (e: PointerEvent<HTMLButtonElement>) => {
    const start = pointerStartRef.current;
    if (!start || suppressClickRef.current) {
      return;
    }

    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 4) {
      suppressClickRef.current = true;
    }
  };

  const handlePointerUpCapture = () => {
    pointerStartRef.current = null;
    if (suppressClickRef.current) {
      globalThis.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  };

  const handleHandleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setActionsOpen((open) => !open);
  };

  return (
    <div
      role="presentation"
      className={cn(
        "group/layout rounded-md transition-colors",
        isDragging && "ring-2 ring-primary/30",
      )}
      onMouseDown={(e) => {
        if (e.button !== 0) {
          return;
        }
        e.stopPropagation();
        onSelectLayout();
      }}
    >
      <div className="flex gap-1 items-start">
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
              onPointerDownCapture={handlePointerDownCapture}
              onPointerMoveCapture={handlePointerMoveCapture}
              onPointerUpCapture={handlePointerUpCapture}
              onClick={handleHandleClick}
              {...dragHandleProps}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            {showActions && (
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

        <div className="min-w-0 flex-1 rounded-md transition-colors hover:bg-muted/20">
          {layout.type === "spacer" ? (
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
    </div>
  );
}
