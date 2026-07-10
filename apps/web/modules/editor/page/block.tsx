"use client";

import {
  getElementConfigPanel,
  getElementEditor,
  hasElementConfigPanel,
} from "@/modules/site-elements/registry";
import { SectionContextProvider } from "@/modules/site-runtime/section";
import type { AnyContent, BlockData, SectionRegion } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { pointerIntersection } from "@dnd-kit/collision";
import { useSortable } from "@dnd-kit/react/sortable";
import { GripVertical, Settings2, Trash2 } from "lucide-react";
import { createElement, useState } from "react";

interface BlockProps {
  block: BlockData;
  index: number;
  columnId: string;
  sectionId: string;
  region: SectionRegion;
  selected: boolean;
  dragDisabled: boolean;
  onSelect: () => void;
  onUpdate: (content: AnyContent) => void;
  onRemove: () => void;
}

export function Block({
  block,
  index,
  columnId,
  sectionId,
  region,
  selected,
  dragDisabled,
  onSelect,
  onUpdate,
  onRemove,
}: BlockProps) {
  const [hovered, setHovered] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const { sourceRef, targetRef, handleRef, isDragging } = useSortable({
    id: block.id,
    index,
    group: columnId,
    type: "block",
    accept: "block",
    collisionDetector: pointerIntersection,
    disabled: dragDisabled,
    data: { kind: "block" },
  });
  const Editor = getElementEditor(block.type);
  const ConfigPanel = hasElementConfigPanel(block.type)
    ? getElementConfigPanel(block.type)
    : null;
  const showControls = hovered || selected;

  return (
    <div
      ref={sourceRef}
      role="presentation"
      className={cn("relative min-w-0 pt-8", isDragging && "opacity-50")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      {showControls ? (
        <div className="absolute left-0 top-0 flex items-center gap-0.5 pb-2">
          <button
            ref={handleRef}
            type="button"
            aria-label="Move block"
            className={cn(
              "flex size-6 cursor-grab items-center justify-center rounded active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
            disabled={dragDisabled}
          >
            <GripVertical className="size-3.5" />
          </button>

          {selected && ConfigPanel ? (
            <Popover open={configOpen} onOpenChange={setConfigOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Block settings"
                  onClick={(event) => event.stopPropagation()}
                >
                  <Settings2 className="size-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="start"
                className="max-h-[min(70vh,32rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[2rem] p-3 sm:w-[min(22rem,calc(100vw-6rem))]"
                onClick={(event) => event.stopPropagation()}
              >
                {createElement(ConfigPanel, {
                  content: block.content,
                  onUpdate,
                  onRemove,
                })}
              </PopoverContent>
            </Popover>
          ) : null}

          {selected ? (
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Delete block"
              className="text-muted-foreground hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </div>
      ) : null}

      <div ref={targetRef} className="rounded-md">
        <SectionContextProvider region={region} sectionId={sectionId}>
          {Editor ? (
            createElement(Editor, {
              id: block.id,
              type: block.type,
              content: block.content,
              isSelected: selected,
              onUpdate,
              onRemove,
            })
          ) : (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No editor for {block.type}.
            </div>
          )}
        </SectionContextProvider>
      </div>
    </div>
  );
}
