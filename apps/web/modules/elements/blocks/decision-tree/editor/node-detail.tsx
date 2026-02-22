"use client";

import { cn } from "@/lib/utils";
import { ElementEditorWrapper } from "@/modules/elements/framework/editor-wrapper";
import {
  getElement,
  getElementConfigPanel,
  hasElementConfigPanel,
} from "@/modules/elements/framework/registry";
import { DndProvider, type DragEndEvent } from "@/modules/shared/dnd";
import type {
  AnyContent,
  DecisionTreeBlockType,
  DecisionTreeContentBlock,
  DecisionTreeNode,
  ElementType,
} from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { Label } from "@baseblocks/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { arrayMove } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

// Block types allowed inside decision tree nodes
const ALLOWED_BLOCK_TYPES: DecisionTreeBlockType[] = [
  "heading",
  "paragraph",
  "callout",
  "code",
  "divider",
];

interface NodeDetailProps {
  node: DecisionTreeNode;
  onUpdateNodeName: (nodeId: string, name: string) => void;
  onUpdateContentBlock: (
    nodeId: string,
    block: DecisionTreeContentBlock,
  ) => void;
  onAddContentBlock: (nodeId: string, type: DecisionTreeBlockType) => void;
  onRemoveContentBlock: (nodeId: string, blockId: string) => void;
  onReorderContentBlocks: (nodeId: string, orderedIds: string[]) => void;
}

export function NodeDetail({
  node,
  onUpdateNodeName,
  onUpdateContentBlock,
  onAddContentBlock,
  onRemoveContentBlock,
  onReorderContentBlocks,
}: NodeDetailProps) {
  const [localName, setLocalName] = useState(node.name);

  useEffect(() => {
    setLocalName(node.name);
  }, [node.name]);

  const debouncedSaveName = useDebounceCallback((name: string) => {
    onUpdateNodeName(node.id, name);
  }, 500);

  const blocks = [...node.contentBlocks].sort((a, b) => a.order - b.order);
  const blockIds = blocks.map((b) => b.id);

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blockIds.indexOf(active.id as string);
    const newIndex = blockIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(blockIds, oldIndex, newIndex);
    onReorderContentBlocks(node.id, reordered);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b space-y-3">
        <h3 className="text-sm font-medium text-primary">Detail Panel</h3>
        <div>
          <Label htmlFor="node-name" className="text-xs text-muted-foreground">
            Option Name
          </Label>
          <Input
            id="node-name"
            value={localName}
            onChange={(e) => {
              setLocalName(e.target.value);
              debouncedSaveName(e.target.value);
            }}
            className="mt-1 text-lg font-semibold"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-4">
          <DndProvider items={blockIds} onDragEnd={handleBlockDragEnd}>
            {blocks.map((block) => (
              <SortableBlock
                key={block.id}
                id={block.id}
                block={block}
                onUpdate={(content) =>
                  onUpdateContentBlock(node.id, {
                    ...block,
                    content,
                  })
                }
                onRemove={() => onRemoveContentBlock(node.id, block.id)}
              />
            ))}
          </DndProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Plus className="size-4 mr-2" />
                Add Block
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {ALLOWED_BLOCK_TYPES.map((type) => {
                const entry = getElement(type);
                if (!entry) return null;
                const Icon = entry.icon;
                return (
                  <DropdownMenuItem
                    key={type}
                    onSelect={() => onAddContentBlock(node.id, type)}
                  >
                    <Icon className="size-4 mr-2" />
                    {entry.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// Reuses the same SortableBlock pattern from layout-slot.tsx
function SortableBlock({
  id,
  block,
  onUpdate,
  onRemove,
}: {
  id: string;
  block: DecisionTreeContentBlock;
  onUpdate: (content: AnyContent) => void;
  onRemove: () => void;
}) {
  const [configOpen, setConfigOpen] = useState(false);
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
    <div ref={setNodeRef} style={style} className="group/block mb-3 min-w-0">
      <div className="flex gap-1 items-start">
        {/* Toolbar: drag handle, config, trash */}
        <div
          className={cn(
            "flex flex-col gap-0.5 shrink-0",
            "transition-opacity",
            "opacity-0 group-hover/block:opacity-100",
          )}
        >
          <div
            ref={setActivatorNodeRef}
            className="flex items-center justify-center h-6 w-6 rounded cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
          {hasConfig && ConfigPanel && (
            <Popover open={configOpen} onOpenChange={setConfigOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
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
                <ConfigPanel
                  content={block.content as AnyContent}
                  onUpdate={onUpdate}
                />
              </PopoverContent>
            </Popover>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Block content - same editor as the rest of BaseBlocks */}
        <div className="min-w-0 flex-1">
          <ElementEditorWrapper
            id={block.id}
            type={blockType}
            content={block.content as AnyContent}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        </div>
      </div>
    </div>
  );
}
