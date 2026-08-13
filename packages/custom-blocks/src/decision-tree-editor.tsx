"use client";

import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Copy01Icon,
  Delete01Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, KeyboardSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { defineOpenEditorCustomBlockEditor } from "@openeditor/custom-block/editor";
import {
  createDocument,
  getDocumentText,
  textBlock,
  type OpenEditorDocument,
} from "@openeditor/core";
import { useMemo, useState } from "react";
import {
  addDecisionNode,
  addDecisionTree,
  deleteDecisionNode,
  deleteDecisionTree,
  duplicateDecisionTree,
  renameDecisionTree,
  updateDecisionDocument,
  updateDecisionTree,
  type DecisionNode,
  type DecisionTree,
} from "./decision-tree";
import {
  removeDecisionTreeNodesFromPath,
  reorderDecisionTreeSiblings,
  resolveDecisionTree,
} from "./decision-tree-navigation";
import { decisionTreeBlock } from "./index";
import { BlockShell, CollectionMenu } from "./ui";

const createId = () => crypto.randomUUID();
const sensors = [
  PointerSensor.configure({
    activationConstraints: () => [
      new PointerActivationConstraints.Distance({ value: 5 }),
    ],
  }),
  KeyboardSensor,
];

function emptyDocument(): OpenEditorDocument {
  return createDocument([textBlock("paragraph", "")]);
}

const documentFromText = (text: string) =>
  createDocument([textBlock("paragraph", text)]);

function DecisionAnswer({
  index,
  node,
  onDelete,
  onOpen,
  onRename,
  total,
}: {
  index: number;
  node: DecisionNode;
  onDelete: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  total: number;
}) {
  const sortable = useSortable<{ kind: "decision-answer"; id: string }>({
    id: node.id,
    index,
    group: `decision-answers-${node.parentId ?? "root"}`,
    data: { kind: "decision-answer", id: node.id },
    collisionDetector: closestCenter,
    type: "decision-answer",
    accept: "decision-answer",
  });
  const label = `Move answer ${index + 1}; position ${index + 1} of ${total}`;
  return (
    <div
      className={`flex min-w-0 items-center gap-1 border-b border-border/60 py-2 last:border-b-0 ${sortable.isDropTarget ? "bg-muted/60" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
    >
      <Button
        aria-label={label}
        className="cursor-grab touch-none active:cursor-grabbing"
        ref={sortable.handleRef}
        size="icon-xs"
        title={label}
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon aria-hidden icon={DragDropVerticalIcon} />
      </Button>
      <Input
        aria-label={`Answer ${index + 1}`}
        className="min-w-0 flex-1 border-transparent bg-transparent font-medium shadow-none hover:bg-muted/40 focus-visible:bg-background"
        onChange={(event) => onRename(event.target.value)}
        value={node.name}
      />
      <Button
        aria-label={`Open ${node.name}`}
        onClick={onOpen}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon aria-hidden icon={ArrowRight01Icon} />
      </Button>
      <Button
        aria-label={`Delete ${node.name}`}
        onClick={onDelete}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <HugeiconsIcon aria-hidden icon={Delete01Icon} />
      </Button>
    </div>
  );
}

function VisitorFlow({
  path,
  setPath,
  tree,
}: {
  path: string[];
  setPath: (path: string[]) => void;
  tree: DecisionTree;
}) {
  const state = useMemo(() => {
    const root = resolveDecisionTree(tree.nodes, []);
    const effectivePath =
      path.length === 0 && root.visibleOptions.length === 1
        ? [root.visibleOptions[0]!.id]
        : path;
    return resolveDecisionTree(tree.nodes, effectivePath);
  }, [tree, path]);
  return (
    <aside
      aria-label="Decision tree preview"
      className="flex min-h-80 min-w-0 flex-col justify-center overflow-hidden border-t border-border/80 bg-muted/20 p-5 sm:p-8 lg:border-l lg:border-t-0"
    >
      <p className="mb-6 text-center text-xs font-medium text-muted-foreground">
        Preview
      </p>
      {state.activeNode ? (
        <h3 className="mb-5 text-balance text-center text-2xl font-semibold leading-tight">
          {getDocumentText(state.activeNode.document) || "Untitled step"}
        </h3>
      ) : null}
      <div className="grid min-w-0 gap-2">
        {state.visibleOptions.map((node) => (
          <button
            className="flex min-h-14 min-w-0 w-full items-center justify-between gap-3 rounded-xl border border-border/80 bg-background p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={node.id}
            onClick={() => setPath([...state.path, node.id])}
            type="button"
          >
            <span className="min-w-0 break-words text-sm font-medium">
              {node.name}
            </span>
            <HugeiconsIcon
              aria-hidden
              className="size-4 shrink-0 text-muted-foreground"
              icon={ArrowRight01Icon}
            />
          </button>
        ))}
      </div>
      {state.path.length > 1 || path.length > 0 ? (
        <button
          className="mx-auto mt-5 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            const next = state.path.slice(0, -1);
            setPath(next.length === 1 ? [] : next);
          }}
          type="button"
        >
          <HugeiconsIcon
            aria-hidden
            className="size-3"
            icon={ArrowLeft01Icon}
          />
          Previous question
        </button>
      ) : null}
    </aside>
  );
}

export const decisionTreeEditor = defineOpenEditorCustomBlockEditor({
  block: decisionTreeBlock,
  render: function DecisionTreeEditor({ data, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [treeId, setTreeId] = useState(data.trees[0]?.id ?? "");
    const [renaming, setRenaming] = useState(false);
    const [editorPath, setEditorPath] = useState<string[]>([]);
    const [previewPath, setPreviewPath] = useState<string[]>([]);
    const [newAnswer, setNewAnswer] = useState("");
    const tree = data.trees.find(({ id }) => id === treeId) ?? data.trees[0];
    const editorState = useMemo(() => {
      const nodes = tree?.nodes ?? [];
      const root = resolveDecisionTree(nodes, []);
      const effectivePath =
        editorPath.length === 0 && root.visibleOptions.length === 1
          ? [root.visibleOptions[0]!.id]
          : editorPath;
      return resolveDecisionTree(nodes, effectivePath);
    }, [tree, editorPath]);
    if (!tree) return null;
    const updateTree = (next: DecisionTree) =>
      updateDataJson(updateDecisionTree(data, next));
    const addAnswer = () => {
      const name = newAnswer.trim();
      if (!name) return;
      const id = createId();
      updateTree(
        addDecisionNode(tree, {
          id,
          name,
          parentId: editorState.activeNode?.id ?? null,
          document: emptyDocument(),
        }),
      );
      setNewAnswer("");
      setEditorPath([...editorState.path, id]);
    };
    const removeNode = (nodeId: string) => {
      const deleted = deleteDecisionNode(tree, nodeId);
      updateTree(deleted.tree);
      setEditorPath((path) =>
        removeDecisionTreeNodesFromPath(path, deleted.removed),
      );
      setPreviewPath((path) =>
        removeDecisionTreeNodesFromPath(path, deleted.removed),
      );
    };

    return (
      <BlockShell label="Edit decision tree" surface>
        <div className="flex min-w-0 items-center border-b border-border/70 bg-muted/35 px-3 py-2">
          {renaming ? (
            <Input
              aria-label="Decision tree name"
              autoFocus
              className="min-w-36 max-w-72 bg-background font-semibold"
              onBlur={() => setRenaming(false)}
              onChange={(event) =>
                updateDataJson(
                  renameDecisionTree(data, tree.id, event.target.value),
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape")
                  setRenaming(false);
              }}
              value={tree.label}
            />
          ) : (
            <CollectionMenu
              currentId={tree.id}
              items={[
                {
                  icon: Add01Icon,
                  label: "Add tree",
                  onSelect: () => {
                    const next = addDecisionTree(data, createId());
                    updateDataJson(next.value);
                    setTreeId(next.activeId);
                    setEditorPath([]);
                    setPreviewPath([]);
                  },
                },
                {
                  label: "Rename tree",
                  onSelect: () => setRenaming(true),
                },
                {
                  icon: Copy01Icon,
                  label: "Duplicate tree",
                  onSelect: () => {
                    const next = duplicateDecisionTree(data, tree.id, createId);
                    updateDataJson(next.value);
                    setTreeId(next.activeId);
                    setEditorPath([]);
                    setPreviewPath([]);
                  },
                },
                {
                  destructive: true,
                  disabled: data.trees.length === 1,
                  icon: Delete01Icon,
                  label: "Delete tree",
                  onSelect: () => {
                    const next = deleteDecisionTree(data, tree.id);
                    updateDataJson(next.value);
                    setTreeId(next.activeId);
                    setEditorPath([]);
                    setPreviewPath([]);
                  },
                  separatorBefore: true,
                },
              ]}
              label="Decision trees"
              onChange={(id) => {
                setTreeId(id);
                setEditorPath([]);
                setPreviewPath([]);
              }}
              options={data.trees}
              valueLabel={tree.label}
            />
          )}
        </div>

        <div className="grid min-w-0 overflow-hidden bg-card lg:grid-cols-2">
          <section className="min-w-0 bg-card p-4 sm:p-6">
            <nav
              aria-label="Edit path"
              className="mb-6 flex min-h-10 items-center gap-1 overflow-x-auto border-b border-border/70 pb-3"
            >
              <Button
                onClick={() => setEditorPath([])}
                size="sm"
                type="button"
                variant={
                  editorState.activeNode?.parentId ? "ghost" : "secondary"
                }
              >
                Start
              </Button>
              {editorState.path.map((nodeId, index) => {
                const node = tree.nodes.find(({ id }) => id === nodeId);
                if (!node?.parentId) return null;
                return (
                  <div className="flex items-center gap-1" key={nodeId}>
                    <span aria-hidden className="text-muted-foreground">
                      /
                    </span>
                    <Button
                      className="max-w-40 truncate"
                      onClick={() =>
                        setEditorPath(editorState.path.slice(0, index + 1))
                      }
                      size="sm"
                      type="button"
                      variant={
                        index === editorState.path.length - 1
                          ? "secondary"
                          : "ghost"
                      }
                    >
                      {node.name}
                    </Button>
                  </div>
                );
              })}
            </nav>

            <div className="space-y-6">
              {editorState.activeNode ? (
                <div className="space-y-4">
                  <div className="flex items-end gap-2">
                    {editorState.activeNode.parentId ? (
                      <label
                        className="min-w-0 flex-1 text-xs font-medium text-muted-foreground"
                        htmlFor={`${editorState.activeNode.id}-answer`}
                      >
                        Answer shown on the previous step
                        <Input
                          aria-label="Answer shown on the previous step"
                          className="mt-1 bg-background font-medium text-foreground"
                          id={`${editorState.activeNode.id}-answer`}
                          onChange={(event) =>
                            updateTree({
                              ...tree,
                              nodes: tree.nodes.map((node) =>
                                node.id === editorState.activeNode?.id
                                  ? { ...node, name: event.target.value }
                                  : node,
                              ),
                            })
                          }
                          value={editorState.activeNode.name}
                        />
                      </label>
                    ) : null}
                    {editorState.activeNode.parentId ? (
                      <Button
                        aria-label={`Delete ${editorState.activeNode.name}`}
                        onClick={() => removeNode(editorState.activeNode!.id)}
                        size="icon"
                        type="button"
                        variant="ghost"
                      >
                        <HugeiconsIcon aria-hidden icon={Delete01Icon} />
                      </Button>
                    ) : null}
                  </div>
                  <label
                    className="block text-xs font-medium text-muted-foreground"
                    htmlFor={`${editorState.activeNode.id}-prompt`}
                  >
                    Question or result
                    <Input
                      aria-label="Question or result"
                      className="mt-1 bg-background text-base font-medium text-foreground"
                      id={`${editorState.activeNode.id}-prompt`}
                      onChange={(event) =>
                        updateTree(
                          updateDecisionDocument(
                            tree,
                            editorState.activeNode!.id,
                            documentFromText(event.target.value),
                          ),
                        )
                      }
                      value={getDocumentText(editorState.activeNode.document)}
                    />
                  </label>
                </div>
              ) : null}

              <DragDropProvider
                sensors={sensors}
                onDragEnd={(event) => {
                  if (event.canceled || !isSortable(event.operation.source))
                    return;
                  const source = event.operation.source;
                  const sourceData = source.data as
                    | { kind: "decision-answer"; id: string }
                    | undefined;
                  if (
                    sourceData?.kind !== "decision-answer" ||
                    source.initialIndex === source.index
                  )
                    return;
                  const target = editorState.visibleOptions[source.index];
                  if (!target) return;
                  updateTree({
                    ...tree,
                    nodes: reorderDecisionTreeSiblings(
                      tree.nodes,
                      editorState.activeNode?.id ?? null,
                      sourceData.id,
                      target.id,
                    ),
                  });
                }}
              >
                <div className="grid border-y border-border/60">
                  {editorState.visibleOptions.map((node, index) => (
                    <DecisionAnswer
                      index={index}
                      key={node.id}
                      node={node}
                      onDelete={() => removeNode(node.id)}
                      onOpen={() =>
                        setEditorPath([...editorState.path, node.id])
                      }
                      onRename={(name) =>
                        updateTree({
                          ...tree,
                          nodes: tree.nodes.map((item) =>
                            item.id === node.id ? { ...item, name } : item,
                          ),
                        })
                      }
                      total={editorState.visibleOptions.length}
                    />
                  ))}
                </div>
              </DragDropProvider>

              <div className="flex gap-2">
                <Input
                  aria-label="New answer"
                  onChange={(event) => setNewAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    addAnswer();
                  }}
                  placeholder={
                    editorState.activeNode ? "Add answer" : "Add starting step"
                  }
                  value={newAnswer}
                />
                <Button
                  aria-label="Add answer"
                  disabled={!newAnswer.trim()}
                  onClick={addAnswer}
                  size="icon"
                  type="button"
                >
                  <HugeiconsIcon aria-hidden icon={Add01Icon} />
                </Button>
              </div>
            </div>
          </section>

          <VisitorFlow
            path={previewPath}
            setPath={setPreviewPath}
            tree={tree}
          />
        </div>
      </BlockShell>
    );
  },
});
