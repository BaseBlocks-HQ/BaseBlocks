"use client";

import {
  createDocument,
  textBlock,
  type OpenEditorDocument,
} from "@openeditor/core";
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
import { Input } from "@baseblocks/ui/input";
import {
  defineOpenEditorReactNode,
  NodeViewWrapper,
  OpenEditorContent,
  OpenEditorViewer,
  type OpenEditorNodeViewProps,
  useOpenEditorController,
} from "@openeditor/react";
import { toHtml, toPlainText } from "@openeditor/exporters";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  GitFork,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { migrationPlaceholderExtension } from "./migration-placeholder";

const nestedDocumentExtensions = [migrationPlaceholderExtension] as const;

type TreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  order: number;
  document: OpenEditorDocument;
};
type Tree = { id: string; label: string; nodes: TreeNode[] };
type TreeValue = { trees: Tree[]; tabsMode: "row" | "dropdown" };

const emptyDocument = () => createDocument([textBlock("paragraph", "")]);
const defaultValue = (): TreeValue => ({
  trees: [{ id: "default", label: "Tree 1", nodes: [] }],
  tabsMode: "row",
});

function readValue(value: unknown): TreeValue {
  if (!value || typeof value !== "object") return defaultValue();
  const candidate = value as Partial<TreeValue>;
  return {
    trees:
      Array.isArray(candidate.trees) && candidate.trees.length > 0
        ? candidate.trees
        : defaultValue().trees,
    tabsMode: candidate.tabsMode === "dropdown" ? "dropdown" : "row",
  };
}

const childrenOf = (nodes: TreeNode[], parentId: string | null) =>
  [...nodes.filter((node) => node.parentId === parentId)].sort(
    (left, right) => left.order - right.order,
  );
const hasChildren = (nodes: TreeNode[], id: string) =>
  nodes.some((node) => node.parentId === id);
function descendants(nodes: TreeNode[], id: string) {
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
  editable = false,
  onAdd,
  onRemove,
  onSelect,
  trees,
}: {
  activeTreeId: string;
  editable?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
  onSelect: (treeId: string) => void;
  trees: Tree[];
}) {
  const activeTree = trees.find((tree) => tree.id === activeTreeId) ?? trees[0];

  if (!activeTree || (!editable && trees.length <= 1)) return null;

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
        {editable ? (
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

function NestedEditor({
  document,
  onChange,
}: {
  document: OpenEditorDocument;
  onChange: (document: OpenEditorDocument) => void;
}) {
  const controller = useOpenEditorController({
    initialDocument: document,
    onChange,
    extensions: nestedDocumentExtensions,
  });
  return <OpenEditorContent className="min-h-40" controller={controller} />;
}

function TreeEditor({
  value,
  onChange,
}: {
  value: TreeValue;
  onChange: (value: TreeValue) => void;
}) {
  const [treeId, setTreeId] = useState(value.trees[0]?.id ?? "default");
  const [path, setPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const tree =
    value.trees.find((item) => item.id === treeId) ?? value.trees[0]!;
  const parentId = path.at(-1) ?? null;
  const children = useMemo(
    () => childrenOf(tree.nodes, parentId),
    [tree.nodes, parentId],
  );
  const selected = tree.nodes.find((node) => node.id === selectedId);
  const selectTree = (nextTreeId: string) => {
    setTreeId(nextTreeId);
    setPath([]);
    setSelectedId(null);
  };
  const updateTree = (next: Tree) =>
    onChange({
      ...value,
      trees: value.trees.map((item) => (item.id === next.id ? next : item)),
    });
  const addTree = () => {
    const nextTree: Tree = {
      id: crypto.randomUUID(),
      label: `Tree ${value.trees.length + 1}`,
      nodes: [],
    };
    onChange({ ...value, trees: [...value.trees, nextTree] });
    selectTree(nextTree.id);
  };
  const removeTree = () => {
    if (value.trees.length <= 1) return;
    const treeIndex = value.trees.findIndex((item) => item.id === tree.id);
    const nextTrees = value.trees.filter((item) => item.id !== tree.id);
    const nextTree = nextTrees[Math.min(treeIndex, nextTrees.length - 1)]!;
    onChange({ ...value, trees: nextTrees });
    selectTree(nextTree.id);
  };
  const add = () => {
    const name = newName.trim();
    if (!name) return;
    updateTree({
      ...tree,
      nodes: [
        ...tree.nodes,
        {
          id: crypto.randomUUID(),
          parentId,
          name,
          order: children.length,
          document: emptyDocument(),
        },
      ],
    });
    setNewName("");
  };
  const remove = (id: string) => {
    const removed = descendants(tree.nodes, id);
    updateTree({
      ...tree,
      nodes: tree.nodes.filter((node) => !removed.has(node.id)),
    });
    setPath((current) => current.filter((item) => !removed.has(item)));
    if (selectedId && removed.has(selectedId)) setSelectedId(null);
  };

  return (
    <section className="not-prose my-4 space-y-3">
      <TreeSwitcher
        activeTreeId={tree.id}
        editable
        onAdd={addTree}
        onRemove={removeTree}
        onSelect={selectTree}
        trees={value.trees}
      />
      <div className="grid min-h-[440px] gap-3 md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card">
          <div className="flex min-w-0 items-center gap-1 px-2 py-2.5">
            {path.length > 0 ? (
              <Button
                aria-label="Go up"
                onClick={() => {
                  setPath((current) => current.slice(0, -1));
                  setSelectedId(null);
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <ChevronLeft className="size-4" />
              </Button>
            ) : null}
            <Button
              className="rounded-xl"
              onClick={() => {
                setPath([]);
                setSelectedId(null);
              }}
              size="sm"
              type="button"
              variant="ghost"
            >
              Root
            </Button>
            {path.map((id, index) => (
              <button
                className="truncate rounded-md px-1 py-0.5 text-xs text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                key={id}
                onClick={() => {
                  setPath(path.slice(0, index + 1));
                  setSelectedId(null);
                }}
                type="button"
              >
                /{tree.nodes.find((node) => node.id === id)?.name ?? "Option"}
              </button>
            ))}
          </div>
          <div className="flex-1 space-y-1.5 p-2">
            {children.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No options here yet.
              </p>
            ) : (
              children.map((node) => (
                <div
                  className={`flex items-center gap-1 rounded-xl p-2 transition ${
                    selectedId === node.id
                      ? "bg-primary/10 text-primary"
                      : "bg-background/60 hover:bg-muted/60"
                  }`}
                  key={node.id}
                >
                  <button
                    className="min-w-0 flex-1 truncate rounded-lg px-1 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setSelectedId(node.id)}
                    type="button"
                  >
                    {node.name}
                  </button>
                  <Button
                    aria-label={`Edit children of ${node.name}`}
                    onClick={() => {
                      setPath((current) => [...current, node.id]);
                      setSelectedId(null);
                    }}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                  <Button
                    aria-label={`Remove ${node.name}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => remove(node.id)}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 p-2.5">
            <Input
              aria-label="New option name"
              className="rounded-xl border-transparent bg-background/70 shadow-none"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") add();
              }}
              placeholder="Add option"
              value={newName}
            />
            <Button
              aria-label="Add option"
              className="shrink-0 rounded-xl"
              disabled={!newName.trim()}
              onClick={add}
              size="icon"
              type="button"
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
        <div className="min-w-0 rounded-2xl bg-card p-4">
          {selected ? (
            <div className="space-y-3">
              <Input
                aria-label="Option name"
                className="rounded-xl border-transparent bg-background/70 font-medium shadow-none"
                onChange={(event) =>
                  updateTree({
                    ...tree,
                    nodes: tree.nodes.map((node) =>
                      node.id === selected.id
                        ? { ...node, name: event.target.value }
                        : node,
                    ),
                  })
                }
                value={selected.name}
              />
              <NestedEditor
                document={selected.document}
                key={selected.id}
                onChange={(document) =>
                  updateTree({
                    ...tree,
                    nodes: tree.nodes.map((node) =>
                      node.id === selected.id ? { ...node, document } : node,
                    ),
                  })
                }
              />
            </div>
          ) : (
            <div className="flex min-h-72 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              Select an option to edit its details.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TreeViewer({ value }: { value: TreeValue }) {
  const [treeId, setTreeId] = useState(value.trees[0]?.id ?? "default");
  const [path, setPath] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const tree =
    value.trees.find((item) => item.id === treeId) ?? value.trees[0]!;
  const options = childrenOf(tree.nodes, path.at(-1) ?? null);
  const selected = tree.nodes.find((node) => node.id === selectedId);
  const selectTree = (nextTreeId: string) => {
    setTreeId(nextTreeId);
    setPath([]);
    setSelectedId(null);
  };
  return (
    <section className="not-prose my-4 space-y-3">
      <TreeSwitcher
        activeTreeId={tree.id}
        onSelect={selectTree}
        trees={value.trees}
      />
      <div className="grid min-h-80 gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-card p-3">
          <Button
            className="rounded-xl"
            onClick={() => {
              setPath([]);
              setSelectedId(null);
            }}
            size="sm"
            type="button"
            variant="ghost"
          >
            <RotateCcw className="size-3.5" />
            Start over
          </Button>
          <div className="mt-2 space-y-2">
            {options.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No more options.
              </p>
            ) : (
              options.map((node) => (
                <button
                  className="flex w-full items-center justify-between rounded-xl bg-background/60 p-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={node.id}
                  onClick={() => {
                    if (hasChildren(tree.nodes, node.id)) {
                      setPath((current) => [...current, node.id]);
                      setSelectedId(null);
                    } else {
                      setSelectedId(node.id);
                    }
                  }}
                  type="button"
                >
                  {node.name}
                  {hasChildren(tree.nodes, node.id) ? (
                    <ChevronRight className="size-4" />
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4">
          {selected ? (
            <>
              <h3 className="mb-3 font-semibold">{selected.name}</h3>
              <OpenEditorViewer
                document={selected.document}
                extensions={nestedDocumentExtensions}
              />
            </>
          ) : (
            <div className="flex min-h-64 items-center justify-center px-6 text-center text-sm text-muted-foreground">
              <GitFork className="mr-2 size-4" />
              Choose an option.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DecisionTreeNode({ node, updateAttributes }: OpenEditorNodeViewProps) {
  const value = readValue(node.attrs.decisionTree);
  return (
    <NodeViewWrapper contentEditable={false}>
      <TreeEditor
        onChange={(decisionTree) => updateAttributes({ decisionTree })}
        value={value}
      />
    </NodeViewWrapper>
  );
}

export const decisionTreeExtension = defineOpenEditorReactNode({
  block: {
    name: "baseblocks.decisionTree",
    nodeType: "baseblocksDecisionTree",
    label: "Decision Tree",
    group: "embed",
    defaultNode: () => ({
      type: "baseblocksDecisionTree",
      attrs: { decisionTree: defaultValue() },
    }),
    support: { web: "supported", native: "unsupported" },
  },
  node: {
    group: "block",
    atom: true,
    draggable: true,
    addAttributes: () => ({ decisionTree: { default: defaultValue() } }),
    parseHTML: () => [{ tag: "section[data-baseblocks-decision-tree]" }],
    renderHTML: ({ HTMLAttributes }) => [
      "section",
      { ...HTMLAttributes, "data-baseblocks-decision-tree": "" },
    ],
  },
  component: DecisionTreeNode,
  slashMenu: { keywords: ["decision", "branch", "wizard", "guide"] },
  viewer: ({ node }) => (
    <TreeViewer value={readValue(node.attrs?.decisionTree)} />
  ),
  exporters: {
    html: {
      baseblocksDecisionTree: ({ node, escapeHtml }) =>
        readValue(node.attrs?.decisionTree)
          .trees.map(
            (tree) =>
              `<section data-baseblocks-decision-tree><h2>${escapeHtml(tree.label)}</h2><ul>${tree.nodes.map((item) => `<li><strong>${escapeHtml(item.name)}</strong>${toHtml(item.document, migrationPlaceholderExtension.exporters)}</li>`).join("")}</ul></section>`,
          )
          .join(""),
    },
    text: {
      baseblocksDecisionTree: ({ node }) =>
        readValue(node.attrs?.decisionTree)
          .trees.flatMap((tree) => [
            tree.label,
            ...tree.nodes.map((item) =>
              [
                `${"  ".repeat(item.parentId ? 1 : 0)}${item.name}`,
                toPlainText(
                  item.document,
                  migrationPlaceholderExtension.exporters,
                ),
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ])
          .join("\n"),
    },
  },
});
