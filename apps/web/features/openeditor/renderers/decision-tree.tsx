"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import {
  Add01Icon,
  CursorPointer02Icon,
  Delete01Icon,
  DragDropVerticalIcon,
  GitForkIcon,
} from "@hugeicons/core-free-icons";
import {
  removeDecisionTreeNodesFromPath,
  reorderDecisionTreeSiblings,
  resolveDecisionTree,
} from "@/features/openeditor/renderers/decision-tree-model";
import { MiddleTruncate } from "@/components/tree/middle-truncate";
import { OverflowTooltip } from "@/components/tree/overflow-tooltip";
import { NamedItemSwitcher } from "@/features/openeditor/renderers/named-item-switcher";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@baseblocks/ui/breadcrumb";
import { Button } from "@baseblocks/ui/button";
import {
  ActionRow,
  ActionRowAction,
  ActionRowActions,
  ActionRowLabel,
  ActionRowMain,
} from "@baseblocks/ui/action-row";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, KeyboardSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@baseblocks/ui/empty";
import { Input } from "@baseblocks/ui/input";
import {
  createDocument,
  textBlock,
  type OpenEditorDocument,
} from "@openeditor/core";
import { OpenEditorViewer } from "@openeditor/react";
import { type ReactNode, useState } from "react";

const decisionTreeSensors = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
  KeyboardSensor,
];

type DecisionOptionSortData = {
  kind: "decision-option";
  itemId: string;
};

export type DecisionNode = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  document: OpenEditorDocument;
};
export type DecisionTree = {
  id: string;
  label: string;
  nodes: DecisionNode[];
};
export type DecisionTreeValue = {
  trees: DecisionTree[];
  tabsMode: "row" | "dropdown";
};

type DecisionTreeProps = {
  onChange?: (value: DecisionTreeValue) => void;
  renderDocument?: (
    node: DecisionNode,
    onChange: (document: OpenEditorDocument) => void,
  ) => ReactNode;
  value: DecisionTreeValue;
};

export function readDecisionTree(value: unknown): DecisionTreeValue {
  const defaultTrees: DecisionTree[] = [
    { id: "default", label: "Tree 1", nodes: [] },
  ];
  if (!value || typeof value !== "object")
    return { trees: defaultTrees, tabsMode: "row" };
  const candidate = value as Partial<DecisionTreeValue>;
  return {
    trees:
      Array.isArray(candidate.trees) && candidate.trees.length > 0
        ? candidate.trees
        : defaultTrees,
    tabsMode: candidate.tabsMode === "dropdown" ? "dropdown" : "row",
  };
}

function DecisionTreeEmptyState({
  variant,
}: {
  variant: "options" | "selection";
}) {
  const isOptionsEmpty = variant === "options";
  const Icon = isOptionsEmpty ? GitForkIcon : CursorPointer02Icon;

  return (
    <Empty className="h-full min-h-0 gap-3 border-0 px-6 py-8 md:p-8">
      <EmptyHeader className="gap-1.5">
        <EmptyMedia className="mb-1 size-9 rounded-xl" variant="icon">
          <HugeiconsIcon className="size-4" icon={Icon} />
        </EmptyMedia>
        <EmptyTitle className="text-sm font-medium">
          {isOptionsEmpty ? "No options yet" : "Open an option"}
        </EmptyTitle>
        <EmptyDescription className="max-w-60 text-xs leading-relaxed">
          {isOptionsEmpty
            ? "There are no options on this path."
            : "Choose an option on the left to view its details."}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function descendants(nodes: DecisionNode[], id: string) {
  const result = new Set([id]);
  let size = 0;
  while (size !== result.size) {
    size = result.size;
    for (const node of nodes)
      if (node.parentId && result.has(node.parentId)) result.add(node.id);
  }
  return result;
}

function TreeSwitcher({
  activeTreeId,
  onAdd,
  onRemove,
  onRename,
  onSelect,
  trees,
}: {
  activeTreeId: string;
  onAdd?: () => void;
  onRemove?: () => void;
  onRename?: (treeId: string, label: string) => void;
  onSelect: (treeId: string) => void;
  trees: DecisionTree[];
}) {
  return (
    <NamedItemSwitcher
      activeId={activeTreeId}
      collectionLabel="Decision trees"
      itemName="tree"
      items={trees}
      onAdd={onAdd}
      onRemove={onRemove}
      onRename={onRename}
      onSelect={onSelect}
    />
  );
}

function SortableDecisionOption({
  count,
  disabled,
  group,
  index,
  node,
  onOpen,
  onRemove,
}: {
  count: number;
  disabled: boolean;
  group: string;
  index: number;
  node: DecisionNode;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const sortable = useSortable<DecisionOptionSortData>({
    id: node.id,
    index,
    group,
    disabled,
    data: { kind: "decision-option", itemId: node.id },
    collisionDetector: closestCenter,
    type: "decision-option",
    accept: "decision-option",
  });

  return (
    <ActionRow
      className={`group/option relative flex min-h-10 items-center overflow-hidden rounded-xl bg-background/60 transition-colors hover:bg-muted group-has-[button:focus-visible]/option:bg-muted pointer-coarse:bg-muted ${
        sortable.isDropTarget ? "bg-muted" : ""
      } ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
    >
      {!disabled ? (
        <ActionRowActions className="px-1" side="start">
          <ActionRowAction asChild>
            <Button
              aria-label={`Move ${node.name}; position ${index + 1} of ${count}`}
              className="touch-none cursor-grab bg-transparent text-muted-foreground transition-colors hover:bg-transparent hover:text-foreground dark:hover:bg-transparent active:cursor-grabbing"
              ref={sortable.handleRef}
              size="icon-xs"
              title="Drag to reorder"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={DragDropVerticalIcon} className="size-4" />
            </Button>
          </ActionRowAction>
        </ActionRowActions>
      ) : null}
      <OverflowTooltip content={node.name}>
        {(textRef) => (
          <ActionRowMain
            className="flex min-w-0 flex-1 items-center rounded-lg px-2 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            onClick={onOpen}
            type="button"
          >
            <ActionRowLabel className="flex min-w-0 flex-1">
              <MiddleTruncate
                className="flex-1"
                leadingRef={textRef}
                text={node.name}
              />
            </ActionRowLabel>
          </ActionRowMain>
        )}
      </OverflowTooltip>
      {!disabled ? (
        <ActionRowActions className="px-1" side="end">
          <ActionRowAction asChild>
            <Button
              aria-label={`Remove ${node.name}`}
              className="bg-transparent text-muted-foreground transition-colors hover:bg-transparent hover:text-destructive dark:hover:bg-transparent"
              onClick={onRemove}
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon icon={Delete01Icon} className="size-4" />
            </Button>
          </ActionRowAction>
        </ActionRowActions>
      ) : null}
    </ActionRow>
  );
}

export function DecisionTree({
  onChange,
  renderDocument,
  value,
}: DecisionTreeProps) {
  const [treeId, setTreeId] = useState(value.trees[0]?.id ?? "default");
  const [path, setPath] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const isMobile = useIsMobile();
  const tree = value.trees.find((item) => item.id === treeId) ?? value.trees[0];

  if (!tree) return null;

  const {
    activeNode,
    path: validPath,
    visibleOptions,
  } = resolveDecisionTree(tree.nodes, path);
  const isEditable = Boolean(onChange);
  const updateTree = (next: DecisionTree) =>
    onChange?.({
      ...value,
      trees: value.trees.map((item) => (item.id === next.id ? next : item)),
    });
  const selectTree = (nextTreeId: string) => {
    setTreeId(nextTreeId);
    setPath([]);
  };
  const addTree = () => {
    const nextTree: DecisionTree = {
      id: crypto.randomUUID(),
      label: `Tree ${value.trees.length + 1}`,
      nodes: [],
    };
    onChange?.({ ...value, trees: [...value.trees, nextTree] });
    selectTree(nextTree.id);
  };
  const removeTree = () => {
    if (value.trees.length <= 1) return;
    const treeIndex = value.trees.findIndex((item) => item.id === tree.id);
    const nextTrees = value.trees.filter((item) => item.id !== tree.id);
    const nextTree = nextTrees[Math.min(treeIndex, nextTrees.length - 1)];
    if (!nextTree) return;
    onChange?.({ ...value, trees: nextTrees });
    selectTree(nextTree.id);
  };
  const renameTree = (treeId: string, label: string) => {
    onChange?.({
      ...value,
      trees: value.trees.map((item) =>
        item.id === treeId ? { ...item, label } : item,
      ),
    });
  };
  const addOption = () => {
    const name = newName.trim();
    if (!name) return;
    updateTree({
      ...tree,
      nodes: [
        ...tree.nodes,
        {
          id: crypto.randomUUID(),
          parentId: activeNode?.id ?? null,
          name,
          order: visibleOptions.length,
          document: createDocument([textBlock("paragraph", "")]),
        },
      ],
    });
    setNewName("");
  };
  const removeOption = (id: string) => {
    const removed = descendants(tree.nodes, id);
    updateTree({
      ...tree,
      nodes: tree.nodes.filter((node) => !removed.has(node.id)),
    });
    setPath((current) => removeDecisionTreeNodesFromPath(current, removed));
  };
  const reorderOption = (sourceId: string, targetId: string) => {
    const nodes = reorderDecisionTreeSiblings(
      tree.nodes,
      activeNode?.id ?? null,
      sourceId,
      targetId,
    );
    if (nodes !== tree.nodes) updateTree({ ...tree, nodes });
  };

  return (
    <section className="not-prose my-4 space-y-3">
      <TreeSwitcher
        activeTreeId={tree.id}
        onAdd={isEditable ? addTree : undefined}
        onRemove={isEditable ? removeTree : undefined}
        onRename={isEditable ? renameTree : undefined}
        onSelect={selectTree}
        trees={value.trees}
      />
      <ResizablePanelGroup
        className="h-[500px] max-h-[70vh] min-h-0 min-w-0"
        orientation={isMobile ? "vertical" : "horizontal"}
      >
        <ResizablePanel defaultSize={42} minSize={25}>
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-card">
            <Breadcrumb
              aria-label="Decision tree path"
              className="flex h-10 min-w-0 items-center border-b border-border/50 px-2"
            >
              <BreadcrumbList className="w-full min-w-0 flex-nowrap overflow-hidden text-xs">
                <BreadcrumbItem className="shrink-0">
                  {validPath.length ? (
                    <BreadcrumbLink asChild>
                      <button onClick={() => setPath([])} type="button">
                        Root
                      </button>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>Root</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {validPath.length > 1 ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label="Show intermediate options"
                            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            type="button"
                          >
                            <BreadcrumbEllipsis className="size-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {validPath.slice(0, -1).map((nodeId, index) => (
                            <DropdownMenuItem
                              key={nodeId}
                              onSelect={() =>
                                setPath(validPath.slice(0, index + 1))
                              }
                            >
                              {tree.nodes.find((node) => node.id === nodeId)
                                ?.name ?? "Option"}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </BreadcrumbItem>
                  </>
                ) : null}
                {validPath.length ? (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem className="min-w-0 flex-1">
                      <BreadcrumbPage className="block min-w-0 truncate font-medium">
                        {activeNode?.name ?? "Option"}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                ) : null}
              </BreadcrumbList>
            </Breadcrumb>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {visibleOptions.length === 0 ? (
                <DecisionTreeEmptyState variant="options" />
              ) : (
                <DragDropProvider
                  sensors={decisionTreeSensors}
                  onDragEnd={(event) => {
                    const source = event.operation.source;
                    const data = source?.data as
                      | DecisionOptionSortData
                      | undefined;
                    if (
                      event.canceled ||
                      data?.kind !== "decision-option" ||
                      !isSortable(source) ||
                      source.initialIndex === source.index
                    ) {
                      return;
                    }
                    const target = visibleOptions[source.index];
                    if (target) reorderOption(data.itemId, target.id);
                  }}
                >
                  <div className="space-y-1.5">
                    {visibleOptions.map((node, index) => (
                      <SortableDecisionOption
                        count={visibleOptions.length}
                        disabled={!isEditable}
                        group={`decision-options:${tree.id}:${activeNode?.id ?? "root"}`}
                        index={index}
                        key={node.id}
                        node={node}
                        onOpen={() => setPath([...validPath, node.id])}
                        onRemove={() => removeOption(node.id)}
                      />
                    ))}
                  </div>
                </DragDropProvider>
              )}
            </div>
            {isEditable ? (
              <div className="flex gap-2 p-2.5">
                <Input
                  aria-label="New option name"
                  className="rounded-xl border-transparent bg-background/70 shadow-none"
                  onChange={(event) => setNewName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addOption();
                  }}
                  placeholder="Add option"
                  value={newName}
                />
                <Button
                  aria-label="Add option"
                  className="shrink-0 rounded-xl"
                  disabled={!newName.trim()}
                  onClick={addOption}
                  size="icon"
                  type="button"
                >
                  <HugeiconsIcon icon={Add01Icon} className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </ResizablePanel>
        <ResizableHandle
          aria-label="Resize decision tree panels"
          className="group/split relative z-20 flex !w-3 shrink-0 cursor-col-resize items-center justify-center bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:before:bg-ring/55 after:absolute after:inset-0 after:bg-transparent before:pointer-events-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-transparent before:transition-colors before:duration-150 data-[panel-group-direction=vertical]:!h-3 data-[panel-group-direction=vertical]:!w-full data-[panel-group-direction=vertical]:cursor-row-resize data-[panel-group-direction=vertical]:before:inset-x-0 data-[panel-group-direction=vertical]:before:top-1/2 data-[panel-group-direction=vertical]:before:h-px data-[panel-group-direction=vertical]:before:w-auto data-[panel-group-direction=vertical]:before:translate-x-0 data-[panel-group-direction=vertical]:before:-translate-y-1/2 data-[resize-handle-state=drag]:before:bg-ring/55"
        />
        <ResizablePanel defaultSize={58} minSize={30}>
          <div className="h-full min-h-0 min-w-0 overflow-y-auto rounded-2xl bg-card p-4">
            {activeNode ? (
              <div className="space-y-3">
                <Input
                  aria-label="Option name"
                  className="rounded-xl border-transparent bg-background/70 font-medium shadow-none"
                  onChange={(event) =>
                    updateTree({
                      ...tree,
                      nodes: tree.nodes.map((node) =>
                        node.id === activeNode.id
                          ? { ...node, name: event.target.value }
                          : node,
                      ),
                    })
                  }
                  readOnly={!isEditable}
                  value={activeNode.name}
                />
                {renderDocument ? (
                  renderDocument(activeNode, (document) =>
                    updateTree({
                      ...tree,
                      nodes: tree.nodes.map((node) =>
                        node.id === activeNode.id
                          ? { ...node, document }
                          : node,
                      ),
                    }),
                  )
                ) : (
                  <OpenEditorViewer document={activeNode.document} />
                )}
              </div>
            ) : (
              <DecisionTreeEmptyState variant="selection" />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </section>
  );
}

export function DecisionTreeViewer({ value }: { value: DecisionTreeValue }) {
  return <DecisionTree value={value} />;
}
