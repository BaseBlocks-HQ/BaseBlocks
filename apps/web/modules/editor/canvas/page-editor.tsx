"use client";

import { usePage } from "@/lib/data";
import { useEditorUi } from "@/modules/editor/app/editor-context";
import { DndProvider } from "@/modules/editor/canvas/dnd";
import { createPageBlock } from "@/modules/editor/page-content";
import { ElementEditorWrapper } from "@/modules/site-elements/authoring/editor-wrapper";
import {
  getElementConfigPanel,
  hasElementConfigPanel,
} from "@/modules/site-elements/authoring/registry";
import { ElementRenderer } from "@/modules/site-runtime/rendering";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import type {
  AnyContent,
  ElementPageBlock,
  ElementType,
  PageBlock,
  SpacerPageBlock,
} from "@baseblocks/domain";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { Spinner } from "@baseblocks/ui/spinner";
import { arrayMove, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Settings2, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { createElement, useEffect, useState } from "react";

interface PageEditorProps {
  pageId: string;
  nested?: boolean;
}

const blockControlClassName = "absolute top-0 left-0 flex items-center gap-0.5";
const blockControlZoneStyle = { paddingTop: "32px" };
const editorFlyoutSurfaceClassName =
  "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-2xl backdrop-blur-md sm:w-[min(22rem,calc(100vw-6rem))]";

function SpacerEditor({
  block,
  onUpdate,
}: {
  block: SpacerPageBlock;
  onUpdate: (block: SpacerPageBlock) => void;
}) {
  const heights: Record<SpacerPageBlock["size"], number> = {
    small: 32,
    medium: 64,
    large: 96,
    xlarge: 128,
  };

  return (
    <div
      className="flex w-full items-center justify-center rounded-md border border-dashed border-muted-foreground/30"
      style={{ height: heights[block.size] }}
    >
      <div className="flex gap-1">
        {(Object.keys(heights) as SpacerPageBlock["size"][]).map((size) => (
          <Button
            key={size}
            size="sm"
            variant={block.size === size ? "default" : "outline"}
            className="h-6 px-2 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onUpdate({ ...block, size });
            }}
          >
            {size}
          </Button>
        ))}
      </div>
    </div>
  );
}

function BlockBody({
  block,
  isSelected,
  onUpdate,
  onRemove,
}: {
  block: PageBlock;
  isSelected: boolean;
  onUpdate: (block: PageBlock) => void;
  onRemove: () => void;
}) {
  if (block.type === "spacer") {
    return <SpacerEditor block={block} onUpdate={onUpdate} />;
  }

  if (block.type === "columns") {
    return (
      <div className="grid gap-4 rounded-md border border-dashed border-muted-foreground/30 p-3 md:grid-cols-2">
        {block.columns.map((column) => (
          <div
            key={column.id}
            className="min-h-20 rounded border border-dashed border-muted-foreground/20 p-3 text-sm text-muted-foreground"
          >
            {column.blocks.length === 0
              ? "Empty column"
              : column.blocks.map((child) => (
                  <ElementRenderer
                    key={child.id}
                    id={child.id}
                    type={child.type as ElementType}
                    content={(child as ElementPageBlock).content}
                  />
                ))}
          </div>
        ))}
      </div>
    );
  }

  if (block.type === "tabs") {
    return (
      <div className="rounded-md border border-dashed border-muted-foreground/30 p-3">
        <div className="mb-3 flex gap-2">
          {block.tabs.map((tab) => (
            <span
              key={tab.id}
              className="rounded-md bg-muted px-2 py-1 text-xs font-medium"
            >
              {tab.label}
            </span>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Tabs are now content blocks. Nested editing is the next layer, not a
          layout-table concern.
        </p>
      </div>
    );
  }

  return (
    <ElementEditorWrapper
      id={block.id}
      type={block.type}
      content={block.content}
      isSelected={isSelected}
      onUpdate={(content) => onUpdate({ ...block, content })}
      onRemove={onRemove}
    />
  );
}

function SortablePageBlock({
  block,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
}: {
  block: PageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (block: PageBlock) => void;
  onRemove: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    ...blockControlZoneStyle,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isElementBlock = !["columns", "tabs", "spacer"].includes(block.type);
  const elementType = block.type as ElementType;
  const hasConfig = isElementBlock && hasElementConfigPanel(elementType);
  const ConfigPanel = hasConfig ? getElementConfigPanel(elementType) : null;
  const showControls = isHovered || isSelected;

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-12 rounded-md border border-dashed border-primary/40 bg-primary/5"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative min-w-0"
      role="presentation"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onSelect();
      }}
    >
      {showControls && (
        <div className={blockControlClassName}>
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>
          {isSelected && ConfigPanel && "content" in block ? (
            <Popover open={configOpen} onOpenChange={setConfigOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon-xs">
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
              >
                {createElement(ConfigPanel, {
                  content: block.content,
                  onUpdate: (content: AnyContent) =>
                    onUpdate({ ...block, content }),
                  onRemove,
                })}
              </PopoverContent>
            </Popover>
          ) : null}
          {isSelected ? (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-destructive"
              onClick={(event) => {
                event.stopPropagation();
                onRemove();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      )}
      <div
        className={cn(
          "rounded-md transition-shadow",
          isSelected && "shadow-[inset_0_0_0_1px_hsl(var(--ring)/0.2)]",
        )}
      >
        <BlockBody
          block={block}
          isSelected={isSelected}
          onUpdate={onUpdate}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

export function PageEditor({ pageId, nested }: PageEditorProps) {
  const page = usePage(pageId);
  const { selection, selectBlock, clearSelection, setCurrentPageId } =
    useEditorUi();
  const appendBlock = useMutation(api.pages.mutations.appendBlock);
  const updateBlock = useMutation(api.pages.mutations.updateBlock);
  const removeBlock = useMutation(api.pages.mutations.removeBlock);
  const reorderBlocks = useMutation(api.pages.mutations.reorderBlocks);

  useEffect(() => {
    if (nested) return;
    setCurrentPageId(pageId);
    return () => setCurrentPageId(null);
  }, [pageId, setCurrentPageId, nested]);

  if (page === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (!page) {
    return <p className="text-muted-foreground">Page not found</p>;
  }

  const blocks = (page.content?.blocks ?? []) as PageBlock[];
  const blockIds = blocks.map((block) => block.id);

  const handleAddDefaultBlock = async () => {
    const block = createPageBlock("richtext");
    if (!block) return;
    await appendBlock({ pageId: pageId as Id<"pages">, block });
    selectBlock(block.id);
  };

  return (
    <div
      role="presentation"
      className="min-h-full w-full"
      onMouseDown={(event) => {
        if (event.button !== 0) return;
        clearSelection();
      }}
    >
      <article className="mx-auto max-w-4xl">
        {!nested && <h1 className="mb-6 text-2xl font-semibold">{page.title}</h1>}
        {blocks.length > 0 ? (
          <div className="space-y-2">
            <DndProvider
              items={blockIds}
              onDragEnd={async ({ active, over }) => {
                if (!over || active.id === over.id) return;
                const oldIndex = blockIds.indexOf(String(active.id));
                const newIndex = blockIds.indexOf(String(over.id));
                if (oldIndex === -1 || newIndex === -1) return;
                const nextBlocks = arrayMove(blocks, oldIndex, newIndex);
                await reorderBlocks({
                  pageId: pageId as Id<"pages">,
                  blockIds: nextBlocks.map((block) => block.id),
                });
              }}
            >
              {blocks.map((block) => (
                <SortablePageBlock
                  key={block.id}
                  block={block}
                  isSelected={selection.blockId === block.id}
                  onSelect={() => selectBlock(block.id)}
                  onUpdate={(nextBlock) =>
                    updateBlock({
                      pageId: pageId as Id<"pages">,
                      blockId: block.id,
                      block: nextBlock,
                    })
                  }
                  onRemove={() =>
                    removeBlock({
                      pageId: pageId as Id<"pages">,
                      blockId: block.id,
                    })
                  }
                />
              ))}
            </DndProvider>
          </div>
        ) : (
          <button
            type="button"
            className="flex min-h-32 w-full items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 text-sm text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              handleAddDefaultBlock();
            }}
          >
            <Plus className="h-4 w-4" />
            Add content
          </button>
        )}
      </article>
    </div>
  );
}
