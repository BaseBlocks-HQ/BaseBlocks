"use client";

import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Delete01Icon,
  DragDropVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@baseblocks/ui/button";
import { Input } from "@baseblocks/ui/input";
import { Textarea } from "@baseblocks/ui/textarea";
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
import { ActionMenu, BlockShell, selectClassName } from "./ui";

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
      className={`flex items-center gap-1 rounded-xl bg-muted/65 p-2 ${sortable.isDropTarget ? "ring-2 ring-ring/50" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
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
        className="min-w-0 flex-1 border-transparent bg-transparent font-medium shadow-none hover:bg-background focus-visible:bg-background"
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
      className="flex min-h-72 flex-col justify-center bg-background p-5 sm:p-8"
    >
      {state.path.length > 1 || path.length > 0 ? (
        <button
          className="order-3 mx-auto mt-5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
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
      {state.activeNode ? (
        <h3 className="mb-5 text-balance text-center text-2xl font-semibold leading-tight">
          {getDocumentText(state.activeNode.document) || "Untitled step"}
        </h3>
      ) : null}
      <div className="grid gap-2">
        {state.visibleOptions.map((node) => (
          <button
            className="group flex min-h-14 w-full items-center justify-between rounded-2xl bg-card p-4 text-left shadow-xs transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            key={node.id}
            onClick={() => setPath([...state.path, node.id])}
            type="button"
          >
            <span className="text-sm font-medium">{node.name}</span>
            <HugeiconsIcon
              aria-hidden
              className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              icon={ArrowRight01Icon}
            />
          </button>
        ))}
      </div>
    </aside>
  );
}

export const decisionTreeEditor = defineOpenEditorCustomBlockEditor({
  block: decisionTreeBlock,
  render: function DecisionTreeEditor({ data, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [treeId, setTreeId] = useState(data.trees[0]?.id ?? "");
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
        <div className="flex min-w-0 flex-wrap items-center gap-2 px-3 py-2">
          {data.trees.length > 1 ? (
            <select
              aria-label="Decision tree"
              className={`${selectClassName} max-w-48`}
              onChange={(event) => {
                setTreeId(event.target.value);
                setEditorPath([]);
                setPreviewPath([]);
              }}
              value={tree.id}
            >
              {data.trees.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : null}
          <Input
            aria-label="Decision tree name"
            className="min-w-36 flex-1 rounded-lg border-transparent bg-transparent font-semibold shadow-none hover:bg-muted/50 focus-visible:bg-background"
            onChange={(event) =>
              updateDataJson(
                renameDecisionTree(data, tree.id, event.target.value),
              )
            }
            value={tree.label}
          />
          <Button
            onClick={() => {
              const next = addDecisionTree(data, createId());
              updateDataJson(next.value);
              setTreeId(next.activeId);
              setEditorPath([]);
              setPreviewPath([]);
            }}
            size="sm"
            type="button"
            variant="outline"
          >
            <HugeiconsIcon aria-hidden icon={Add01Icon} />
            Tree
          </Button>
          <ActionMenu
            items={[
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
              },
            ]}
            label="Decision tree actions"
          />
        </div>

        <div className="grid min-h-[44rem] overflow-hidden bg-background lg:grid-cols-[minmax(25rem,0.95fr)_minmax(28rem,1.05fr)]">
          <section className="border-r bg-muted/25 p-4 sm:p-6">
            <nav
              aria-label="Edit path"
              className="mb-4 flex min-h-11 items-center gap-1 overflow-x-auto rounded-xl bg-card p-2 shadow-xs"
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

            <div className="space-y-5 rounded-2xl bg-card p-4 shadow-xs">
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
                    <Textarea
                      aria-label="Question or result"
                      className="mt-1 min-h-24 bg-background text-base font-medium text-foreground"
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
                <div className="grid gap-2">
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
