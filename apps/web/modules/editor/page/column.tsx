"use client";

import { Block } from "@/modules/editor/page/block";
import type { Doc, Id } from "@baseblocks/backend";
import type { AnyContent, SectionRegion } from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { CollisionPriority } from "@dnd-kit/abstract";
import { pointerIntersection } from "@dnd-kit/collision";
import { useDroppable } from "@dnd-kit/react";
import { Plus } from "lucide-react";

interface ColumnProps {
  column: Doc<"columns">;
  blocks: Doc<"blocks">[];
  region: SectionRegion;
  selectedColumnId: string | null;
  selectedBlockId: string | null;
  draggingBlockId: string | null;
  canEdit: boolean;
  dragDisabled: boolean;
  onSelectColumn: (columnId: Id<"columns">) => void;
  onSelectBlock: (blockId: Id<"blocks">, columnId: Id<"columns">) => void;
  onAddBlock: (columnId: Id<"columns">) => void;
  onUpdateBlock: (blockId: Id<"blocks">, content: AnyContent) => void;
  onRemoveBlock: (blockId: Id<"blocks">) => void;
}

export function Column({
  column,
  blocks,
  region,
  selectedColumnId,
  selectedBlockId,
  draggingBlockId,
  canEdit,
  dragDisabled,
  onSelectColumn,
  onSelectBlock,
  onAddBlock,
  onUpdateBlock,
  onRemoveBlock,
}: ColumnProps) {
  const selected = selectedColumnId === column._id;
  const { ref, isDropTarget } = useDroppable({
    id: column._id,
    type: "column",
    accept: "block",
    collisionDetector: pointerIntersection,
    collisionPriority: CollisionPriority.Low,
    disabled: dragDisabled || blocks.length > 0,
    data: { kind: "column", columnId: column._id },
  });

  return (
    <div
      ref={ref}
      role="presentation"
      className={cn(
        "min-h-12 min-w-0 rounded-md border border-transparent",
        selected && "border-primary/50 bg-primary/5",
        isDropTarget && "ring-2 ring-primary/30",
      )}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelectColumn(column._id);
      }}
    >
      <div className="flex flex-col gap-2">
        {blocks.map((block, index) => (
          <div key={block._id} className="relative">
            {draggingBlockId === block._id ? (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 -top-1 z-10 h-0.5 rounded-full bg-primary shadow-[0_0_0_1px_hsl(var(--background)),0_0_0_3px_hsl(var(--primary)/0.18)]"
              />
            ) : null}
            <Block
              block={block}
              index={index}
              columnId={column._id}
              sectionId={column.sectionId}
              region={region}
              selected={selectedBlockId === block._id}
              dragDisabled={dragDisabled}
              onSelect={() => onSelectBlock(block._id, column._id)}
              onUpdate={(content) => onUpdateBlock(block._id, content)}
              onRemove={() => onRemoveBlock(block._id)}
            />
          </div>
        ))}

        <button
          type="button"
          aria-label="Add block"
          className={cn(
            "flex min-h-10 items-center justify-center rounded border border-dashed text-xs text-muted-foreground hover:text-foreground",
            blocks.length === 0
              ? "border-muted-foreground/30 hover:border-muted-foreground/50"
              : "border-transparent hover:border-muted-foreground/30",
          )}
          disabled={!canEdit}
          onClick={(event) => {
            event.stopPropagation();
            onAddBlock(column._id);
          }}
        >
          <Plus className="size-3" />
          {blocks.length === 0 ? <span className="ml-1">Add block</span> : null}
        </button>
      </div>
    </div>
  );
}
