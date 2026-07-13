"use client";

import {
  removeDecisionTreeNodesFromPath,
  resolveDecisionTree,
} from "@/features/openeditor/renderers/decision-tree-model";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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
import {
  ChevronsUpDown,
  GitFork,
  MousePointerClick,
  Plus,
  Trash2,
} from "lucide-react";
import { type ReactNode, useState } from "react";

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
  const Icon = isOptionsEmpty ? GitFork : MousePointerClick;

  return (
    <Empty className="h-full min-h-0 gap-3 border-0 px-6 py-8 md:p-8">
      <EmptyHeader className="gap-1.5">
        <EmptyMedia className="mb-1 size-9 rounded-xl" variant="icon">
          <Icon className="size-4" />
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
  onSelect,
  trees,
}: {
  activeTreeId: string;
  onAdd?: () => void;
  onRemove?: () => void;
  onSelect: (treeId: string) => void;
  trees: DecisionTree[];
}) {
  const activeTree = trees.find((tree) => tree.id === activeTreeId) ?? trees[0];

  if (!activeTree) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="max-w-64 justify-between gap-2 rounded-xl"
          size="sm"
          type="button"
          variant="outline"
        >
          <span className="truncate">{activeTree.label}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Decision trees</DropdownMenuLabel>
        <DropdownMenuRadioGroup onValueChange={onSelect} value={activeTree.id}>
          {trees.map((tree) => (
            <DropdownMenuRadioItem key={tree.id} value={tree.id}>
              <span className="truncate">{tree.label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {onAdd && onRemove ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onAdd}>
              <Plus />
              Add tree
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={trees.length <= 1}
              onSelect={onRemove}
              variant="destructive"
            >
              <Trash2 />
              Remove tree
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
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

  return (
    <section className="not-prose my-4 space-y-3">
      <TreeSwitcher
        activeTreeId={tree.id}
        onAdd={isEditable ? addTree : undefined}
        onRemove={isEditable ? removeTree : undefined}
        onSelect={selectTree}
        trees={value.trees}
      />
      <div className="grid h-[500px] max-h-[70vh] gap-3 overflow-hidden md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-card">
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
              <div className="space-y-1.5">
                {visibleOptions.map((node) => (
                  <div
                    className="group flex items-center gap-1 rounded-xl bg-background/60 p-2 transition hover:bg-muted/60"
                    key={node.id}
                  >
                    <button
                      className="flex min-w-0 flex-1 items-center justify-between gap-2 truncate rounded-lg px-1 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setPath([...validPath, node.id])}
                      type="button"
                    >
                      <span className="truncate">{node.name}</span>
                    </button>
                    {isEditable ? (
                      <Button
                        aria-label={`Remove ${node.name}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeOption(node.id)}
                        size="icon-xs"
                        type="button"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
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
                <Plus className="size-4" />
              </Button>
            </div>
          ) : null}
        </div>
        <div className="min-h-0 min-w-0 overflow-y-auto rounded-2xl bg-card p-4">
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
                      node.id === activeNode.id ? { ...node, document } : node,
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
      </div>
    </section>
  );
}

export function DecisionTreeViewer({ value }: { value: DecisionTreeValue }) {
  return <DecisionTree value={value} />;
}
