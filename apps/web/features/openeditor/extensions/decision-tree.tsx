"use client";

import { baseBlocksSlashMenuOrder } from "@/features/openeditor/slash-menu";
import {
  DecisionTreeViewer,
  readDecisionTree,
} from "@/features/openeditor/renderers/decision-tree";
import {
  createDocument,
  textBlock,
  type OpenEditorDocument,
} from "@openeditor/core";
import { Button } from "@baseblocks/ui/button";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@baseblocks/ui/breadcrumb";
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
  type OpenEditorNodeViewProps,
  useOpenEditorController,
} from "@openeditor/react";
import { toHtml, toPlainText } from "@openeditor/exporters";
import { ChevronsUpDown, GitFork, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { DecisionTreeEditorEmptyState } from "@/features/openeditor/extensions/decision-tree/editor-empty-state";
import {
  removeDecisionTreeNodesFromPath,
  resolveDecisionTreeEditor,
} from "@/features/openeditor/extensions/decision-tree/editor-model";
const nestedDocumentExtensions = [] as const;
const nestedDocumentExporters = {};

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
  const [newName, setNewName] = useState("");
  const tree =
    value.trees.find((item) => item.id === treeId) ?? value.trees[0]!;
  const {
    activeNode,
    path: validPath,
    visibleOptions,
  } = resolveDecisionTreeEditor(tree.nodes, path);
  const parentId = activeNode?.id ?? null;
  const selectTree = (nextTreeId: string) => {
    setTreeId(nextTreeId);
    setPath([]);
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
          order: visibleOptions.length,
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
    setPath((current) => removeDecisionTreeNodesFromPath(current, removed));
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
                      {tree.nodes.find((node) => node.id === validPath.at(-1))
                        ?.name ?? "Option"}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : null}
            </BreadcrumbList>
          </Breadcrumb>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {visibleOptions.length === 0 ? (
              <DecisionTreeEditorEmptyState variant="options" />
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
                ))}
              </div>
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
                value={activeNode.name}
              />
              <NestedEditor
                document={activeNode.document}
                key={activeNode.id}
                onChange={(document) =>
                  updateTree({
                    ...tree,
                    nodes: tree.nodes.map((node) =>
                      node.id === activeNode.id ? { ...node, document } : node,
                    ),
                  })
                }
              />
            </div>
          ) : (
            <DecisionTreeEditorEmptyState variant="selection" />
          )}
        </div>
      </div>
    </section>
  );
}

function DecisionTreeNode({
  editor,
  node,
  updateAttributes,
}: OpenEditorNodeViewProps) {
  const value = readDecisionTree(node.attrs.decisionTree);
  return (
    <NodeViewWrapper contentEditable={false}>
      {editor.isEditable ? (
        <TreeEditor
          onChange={(decisionTree) => updateAttributes({ decisionTree })}
          value={value}
        />
      ) : (
        <DecisionTreeViewer value={value} />
      )}
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
  insertMenu: {
    icon: GitFork,
    keywords: ["decision", "branch", "wizard", "guide"],
    order: baseBlocksSlashMenuOrder.decisionTree,
  },
  viewer: ({ node }) => (
    <DecisionTreeViewer value={readDecisionTree(node.attrs?.decisionTree)} />
  ),
  exporters: {
    html: {
      baseblocksDecisionTree: ({ node, escapeHtml }) =>
        readDecisionTree(node.attrs?.decisionTree)
          .trees.map(
            (tree) =>
              `<section data-baseblocks-decision-tree><h2>${escapeHtml(tree.label)}</h2><ul>${tree.nodes.map((item) => `<li><strong>${escapeHtml(item.name)}</strong>${toHtml(item.document, nestedDocumentExporters)}</li>`).join("")}</ul></section>`,
          )
          .join(""),
    },
    text: {
      baseblocksDecisionTree: ({ node }) =>
        readDecisionTree(node.attrs?.decisionTree)
          .trees.flatMap((tree) => [
            tree.label,
            ...tree.nodes.map((item) =>
              [
                `${"  ".repeat(item.parentId ? 1 : 0)}${item.name}`,
                toPlainText(item.document, nestedDocumentExporters),
              ]
                .filter(Boolean)
                .join("\n"),
            ),
          ])
          .join("\n"),
    },
  },
});
