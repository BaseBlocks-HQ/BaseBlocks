"use client";

import { Button } from "@/components/ui/button";
import { getSectionGridStyle, SPACER_SECTION_HEIGHTS } from "@/lib/sections";
import { cn } from "@/lib/utils";
import type { BlockContent, SectionData, SpacerSectionHeight } from "@/types";
import { GripVertical, MoveVertical, Trash2 } from "lucide-react";
import type { HTMLAttributes, Ref } from "react";
import { SectionSlot } from "./section-slot";

export interface SectionRendererProps {
  section: SectionData;
  isSelected: boolean;
  selectedSlotId: string | null;
  selectedBlockId: string | null;
  onSelectSection: () => void;
  onSelectSlot: (slotId: string) => void;
  onSelectBlock: (slotId: string, blockId: string) => void;
  onAddBlock: (slotId: string) => void;
  onUpdateBlock: (
    slotId: string,
    blockId: string,
    content: BlockContent,
  ) => void;
  onRemoveBlock: (slotId: string, blockId: string) => void;
  onMoveBlock?: (
    fromSlotId: string,
    toSlotId: string,
    blockId: string,
    toIndex: number,
  ) => void;
  onRemove: () => void;
  onUpdateSettings?: (settings: SectionData["settings"]) => void;
  // DnD props passed from SortableSection
  dragHandleRef?: Ref<HTMLDivElement>;
  dragHandleProps?: HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
}

export function SectionRenderer({
  section,
  isSelected,
  selectedSlotId,
  selectedBlockId,
  onSelectSection,
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
}: SectionRendererProps) {
  const gridStyle = getSectionGridStyle(section.type, section.settings);
  const spacerHeight = section.settings.spacerHeight ?? "medium";

  const handleSpacerHeightChange = (height: SpacerSectionHeight) => {
    onUpdateSettings?.({ ...section.settings, spacerHeight: height });
  };

  return (
    <div
      className={cn(
        "group/section relative rounded-md transition-colors",
        // Subtle left border for selection instead of ring (no layout shift)
        isSelected
          ? "border-l-2 border-l-primary bg-muted/30"
          : "border-l-2 border-l-transparent hover:bg-muted/20",
        isDragging && "ring-2 ring-primary/30",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelectSection();
      }}
    >
      {/* Section toolbar - compact, left edge. Hidden when a block is selected (contextual controls) */}
      <div
        className={cn(
          "absolute -left-8 top-1 flex flex-col gap-0.5",
          "transition-opacity",
          // Only show when hovering section AND no block is selected
          selectedBlockId
            ? "opacity-0 pointer-events-none"
            : "opacity-0 group-hover/section:opacity-100",
        )}
      >
        <div
          ref={dragHandleRef}
          role="button"
          tabIndex={0}
          className={cn(
            "flex items-center justify-center h-6 w-6 rounded",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "cursor-grab active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

      {/* Section content */}
      {section.type === "spacer" ? (
        /* Spacer section - renders as vertical space with height controls */
        <div
          className={cn(
            "w-full border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center gap-3 transition-colors",
            "hover:border-muted-foreground/50 hover:bg-muted/30",
            SPACER_SECTION_HEIGHTS[spacerHeight].value,
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <MoveVertical className="h-4 w-4" />
            <span className="text-xs">Spacer</span>
          </div>

          {/* Height controls - always visible */}
          <div className="flex gap-1">
            {(
              Object.keys(SPACER_SECTION_HEIGHTS) as SpacerSectionHeight[]
            ).map((size) => (
              <Button
                key={size}
                variant={spacerHeight === size ? "default" : "outline"}
                size="sm"
                className="h-6 w-6 p-0 text-xs"
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
        /* Regular sections with slots */
        <div style={gridStyle} className="min-h-[48px] p-1 overflow-hidden">
          {section.slots.map((slot) => (
            <SectionSlot
              key={slot.id}
              slot={slot}
              sectionId={section.id}
              sectionType={section.type}
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
  );
}
