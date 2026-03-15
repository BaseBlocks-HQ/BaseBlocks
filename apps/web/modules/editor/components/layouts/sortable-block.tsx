"use client";

import { useBlockClipboardOptional } from "@/modules/editor/contexts/block-clipboard-context";
import { isCopyableBlockType } from "@/modules/editor/lib/block-clipboard";
import { ElementEditorWrapper } from "@/modules/elements/framework/editor-wrapper";
import { LayoutContextProvider } from "@/modules/elements/framework/layout-context";
import {
  getElementConfigPanel,
  hasElementConfigPanel,
} from "@/modules/elements/framework/registry";
import {
  useEditorSiteOptional,
  useEditorUiOptional,
} from "@/modules/shared/contexts/editor-context";
import type { AnyContent, ElementType, LayoutType } from "@baseblocks/types";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, GripVertical, Settings2, Trash2 } from "lucide-react";
import {
  type MouseEvent,
  type PointerEvent,
  createElement,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

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
  const [actionsOpen, setActionsOpen] = useState(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressClickRef = useRef(false);
  const editorSite = useEditorSiteOptional();
  const editorUi = useEditorUiOptional();
  const clipboard = useBlockClipboardOptional();
  const showControls = editorUi?.showControls ?? true;
  const canEdit = editorSite?.canEdit ?? true;
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
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const blockType = block.type as ElementType;
  const hasConfig = hasElementConfigPanel(blockType);
  const ConfigPanel = hasConfig ? getElementConfigPanel(blockType) : null;
  const canCopyBlock = canEdit && isCopyableBlockType(block.type);
  const showActions = isSelected && actionsOpen;

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

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-[40px] rounded border border-dashed border-primary/40 bg-primary/5 mb-2"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="presentation"
      className="group/block mb-3 min-w-0"
      onMouseDown={(e) => {
        if (e.button !== 0) {
          return;
        }
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="flex gap-1 items-start">
        {showControls && (
          <div
            className={cn(
              "flex flex-col gap-0.5 shrink-0",
              "transition-opacity",
              "opacity-0 group-hover/block:opacity-100",
              isSelected && "opacity-100",
            )}
          >
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
              onPointerDownCapture={handlePointerDownCapture}
              onPointerMoveCapture={handlePointerMoveCapture}
              onPointerUpCapture={handlePointerUpCapture}
              onClick={handleHandleClick}
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>

            {showActions && (
              <>
                {hasConfig && ConfigPanel && (
                  <Popover
                    open={isSelected && configOpen}
                    onOpenChange={setConfigOpen}
                  >
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
                      side="left"
                      align="start"
                      className="w-64"
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
                      })}
                    </PopoverContent>
                  </Popover>
                )}
                {canCopyBlock && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      clipboard?.copyBlock({
                        type: block.type,
                        content: block.content,
                      });
                      toast.success("Block copied");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
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

        <div className="min-w-0 flex-1">
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
    </div>
  );
}
