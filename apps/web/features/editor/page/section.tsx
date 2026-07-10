"use client";

import { Column } from "@/features/editor/page/column";
import type {
  AnyContent,
  BlockData,
  ColumnData,
  SectionData,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Trash2 } from "lucide-react";
import { useState } from "react";

interface SectionProps {
  section: SectionData;
  columns: ColumnData[];
  blocksByColumn: Record<string, BlockData[]>;
  index: number;
  selectedSectionId: string | null;
  selectedColumnId: string | null;
  selectedBlockId: string | null;
  draggingBlockId: string | null;
  canEdit: boolean;
  dragDisabled: boolean;
  onSelectSection: (sectionId: string) => void;
  onSelectColumn: (columnId: string) => void;
  onSelectBlock: (blockId: string, columnId: string) => void;
  onAddBlock: (columnId: string) => void;
  onUpdateBlock: (blockId: string, content: AnyContent) => void;
  onRemoveBlock: (blockId: string) => void;
  onRemove: (sectionId: string) => void;
}

export function Section({
  section,
  columns,
  blocksByColumn,
  index,
  selectedSectionId,
  selectedColumnId,
  selectedBlockId,
  draggingBlockId,
  canEdit,
  dragDisabled,
  onSelectSection,
  onSelectColumn,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
  onRemove,
}: SectionProps) {
  const [hovered, setHovered] = useState(false);
  const { ref, handleRef, isDragging } = useSortable({
    id: section.id,
    index,
    group: `section:${section.region}`,
    type: `section:${section.region}`,
    accept: `section:${section.region}`,
    disabled: dragDisabled,
    data: { kind: "section", region: section.region },
  });
  const selected = selectedSectionId === section.id;
  const hasSelectedChild = columns.some(
    (column) =>
      column.id === selectedColumnId ||
      (blocksByColumn[column.id] ?? []).some(
        (block) => block.id === selectedBlockId,
      ),
  );
  const isBlockDropTarget =
    draggingBlockId !== null &&
    columns.some((column) =>
      (blocksByColumn[column.id] ?? []).some(
        (block) => block.id === draggingBlockId,
      ),
    );

  return (
    <section
      ref={ref}
      className={cn("relative pt-8", isDragging && "opacity-50")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelectSection(section.id);
      }}
    >
      {hovered || selected ? (
        <div className="absolute left-0 top-0 flex items-center gap-0.5 pb-2">
          <button
            ref={handleRef}
            type="button"
            aria-label="Move section"
            className="flex size-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
            disabled={dragDisabled}
          >
            <GripVertical className="size-3.5" />
          </button>
          {selected ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete section"
              className="text-muted-foreground hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onRemove(section.id);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "grid min-h-12 gap-6 rounded-md border border-transparent p-2 transition-colors",
          hovered &&
            !selected &&
            !hasSelectedChild &&
            "border-border/50 bg-muted/20",
          selected && !hasSelectedChild && "border-ring/30 bg-muted/25",
          selected && hasSelectedChild && "border-ring/20 bg-muted/15",
          isBlockDropTarget && "border-primary/30 bg-primary/5",
        )}
        style={{
          gridTemplateColumns: `repeat(${Math.max(columns.length, 1)}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            blocks={blocksByColumn[column.id] ?? []}
            region={section.region}
            selectedColumnId={selectedColumnId}
            selectedBlockId={selectedBlockId}
            draggingBlockId={draggingBlockId}
            canEdit={canEdit}
            dragDisabled={dragDisabled}
            onSelectColumn={onSelectColumn}
            onSelectBlock={onSelectBlock}
            onAddBlock={onAddBlock}
            onUpdateBlock={onUpdateBlock}
            onRemoveBlock={onRemoveBlock}
          />
        ))}
      </div>
    </section>
  );
}
