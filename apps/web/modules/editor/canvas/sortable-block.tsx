"use client";

import { useBlockClipboardOptional } from "@/modules/editor/clipboard/block-clipboard-context";
import { isCopyableBlockType } from "@/modules/editor/clipboard/block-clipboard";
import { ElementEditorWrapper } from "@/modules/editor/elements/framework/editor-wrapper";
import { LayoutContextProvider } from "@/modules/editor/elements/framework/layout-context";
import {
  getElementConfigPanel,
  hasElementConfigPanel,
} from "@/modules/editor/elements/framework/registry";
import { useEditorSiteOptional } from "@/modules/editor/state";
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
import { Copy, GripVertical, Settings2, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { createElement, useState } from "react";
import { toast } from "sonner";
import { editorFlyoutSurfaceClassName } from "@/modules/editor/app/editor-flyout-surface";
import { getEditorBlockSurfaceClassName } from "./editor-chrome";
import {
  editorControlRowClassName,
  editorControlZoneStyle,
} from "./editor-spacing";

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
  const tToast = useTranslations("editor.toasts");
  const [configOpen, setConfigOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const editorSite = useEditorSiteOptional();
  const clipboard = useBlockClipboardOptional();
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
    ...editorControlZoneStyle,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const blockType = block.type as ElementType;
  const hasConfig = hasElementConfigPanel(blockType);
  const ConfigPanel = hasConfig ? getElementConfigPanel(blockType) : null;
  const canCopyBlock = canEdit && isCopyableBlockType(block.type);

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
                    toast.success(tToast("blockCopied"));
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

      <div
        className={getEditorBlockSurfaceClassName({
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
