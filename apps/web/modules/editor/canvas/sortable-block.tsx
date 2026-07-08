"use client";

import { ElementEditorWrapper } from "@/modules/site-elements/authoring/editor-wrapper";
import { LayoutContextProvider } from "@/modules/site-runtime/layout";
import {
  getElementConfigPanel,
  hasElementConfigPanel,
} from "@/modules/site-elements/authoring/registry";
import type { AnyContent, ElementType, LayoutType } from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Settings2, Trash2 } from "lucide-react";
import { createElement, useState } from "react";

const editorControlRowClassName =
  "absolute top-0 left-0 flex items-center gap-0.5 pb-2";
const editorControlZoneStyle = { paddingTop: "32px" };

function getBlockSurfaceClassName({ isSelected }: { isSelected: boolean }) {
  return cn(
    "rounded-md transition-[background-color,box-shadow] duration-150 ease-out",
    isSelected && "shadow-[inset_0_0_0_1px_hsl(var(--ring)/0.2)]",
  );
}

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

const editorFlyoutSurfaceClassName =
  "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-2xl backdrop-blur-md sm:w-[min(22rem,calc(100vw-6rem))]";

export function SortableBlock({
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
  const [isHovered, setIsHovered] = useState(false);
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
    ...editorControlZoneStyle,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const blockType = block.type as ElementType;
  const hasConfig = hasElementConfigPanel(blockType);
  const ConfigPanel = hasConfig ? getElementConfigPanel(blockType) : null;

  const showControls = isHovered || isSelected;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[40px] rounded border border-dashed border-primary/40 bg-primary/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="presentation"
      className="relative min-w-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onSelect();
      }}
    >
      {/* Controls live in the reserved top zone — content never shifts. */}
      {showControls && (
        <div className={editorControlRowClassName}>
          <button
            ref={setActivatorNodeRef}
            type="button"
            className={cn(
              "flex items-center justify-center h-6 w-6 rounded",
              "cursor-grab active:cursor-grabbing",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isSelected
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          {isSelected && (
            <>
              {hasConfig && ConfigPanel && (
                <Popover open={configOpen} onOpenChange={setConfigOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className={cn(
                      editorFlyoutSurfaceClassName,
                      "max-h-[min(70vh,32rem)] overflow-y-auto p-3",
                    )}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDownOutside={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-slot="select-content"]')) {
                        e.preventDefault();
                      }
                    }}
                  >
                    {createElement(ConfigPanel, {
                      content: block.content,
                      onUpdate,
                      onRemove,
                    })}
                  </PopoverContent>
                </Popover>
              )}
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
            </>
          )}
        </div>
      )}

      <div
        className={getBlockSurfaceClassName({
          isSelected,
        })}
      >
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
  );
}
