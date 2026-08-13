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
import { closestCenter } from "@dnd-kit/collision";
import { PointerActivationConstraints, PointerSensor } from "@dnd-kit/dom";
import { DragDropProvider, KeyboardSensor } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import type { OpenEditorDocument } from "@openeditor/custom-block";
import {
  defineOpenEditorCustomBlockEditor,
  type OpenEditorCustomBlockDocumentEditorProps,
} from "@openeditor/custom-block/editor";
import { type ComponentType, useMemo, useState } from "react";
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
import { ActionMenu, BlockShell, BlockToolbar, selectClassName } from "./ui";

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
  return {
    type: "doc",
    version: 1,
    content: [{ type: "paragraph", attrs: { "openeditor-id": createId() } }],
  };
}

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
      className={`flex items-center gap-1 rounded-lg border bg-background p-1 ${sortable.isDropTarget ? "border-ring bg-muted" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
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
        className="min-w-0 flex-1 rounded-md border-transparent bg-transparent shadow-none focus-visible:bg-card"
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
  Document,
  path,
  setPath,
  tree,
}: {
  Document: ComponentType<OpenEditorCustomBlockDocumentEditorProps>;
  path: string[];
  setPath: (path: string[]) => void;
  tree: DecisionTree;
}) {
  const state = useMemo(
    () => resolveDecisionTree(tree.nodes, path),
    [tree, path],
  );
  return (
    <aside
      aria-label="Decision tree preview"
      className="min-h-48 rounded-xl border bg-card p-4"
    >
      {state.path.length ? (
        <Button
          className="mb-4"
          onClick={() => setPath(state.path.slice(0, -1))}
          size="sm"
          type="button"
          variant="ghost"
        >
          <HugeiconsIcon aria-hidden icon={ArrowLeft01Icon} />
          Back
        </Button>
      ) : null}
      {state.activeNode ? (
        <div className="mb-5">
          <Document
            ariaLabel={state.activeNode.name}
            onChange={() => undefined}
            value={state.activeNode.document}
          />
        </div>
      ) : null}
      <div className="grid gap-2">
        {state.visibleOptions.map((node) => (
          <Button
            className="h-auto min-h-11 justify-between whitespace-normal rounded-xl px-4 py-2 text-left"
            key={node.id}
            onClick={() => setPath([...state.path, node.id])}
            type="button"
            variant="outline"
          >
            <span>{node.name}</span>
            <HugeiconsIcon aria-hidden icon={ArrowRight01Icon} />
          </Button>
        ))}
      </div>
    </aside>
  );
}

export const decisionTreeEditor = defineOpenEditorCustomBlockEditor({
  block: decisionTreeBlock,
  render: function DecisionTreeEditor({ data, host, updateData }) {
    const updateDataJson = (value: unknown) => updateData(value as typeof data);
    const [treeId, setTreeId] = useState(data.trees[0]?.id ?? "");
    const [editorPath, setEditorPath] = useState<string[]>([]);
    const [previewPath, setPreviewPath] = useState<string[]>([]);
    const [newAnswer, setNewAnswer] = useState("");
    const tree = data.trees.find(({ id }) => id === treeId) ?? data.trees[0];
    const editorState = useMemo(
      () => resolveDecisionTree(tree?.nodes ?? [], editorPath),
      [tree, editorPath],
    );
    if (!tree) return null;
    const Document = host.fields.document;
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

    return (
      <BlockShell label="Edit decision tree">
        <BlockToolbar>
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
            className="min-w-36 flex-1 rounded-xl border-transparent bg-background/70 font-medium shadow-none"
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
        </BlockToolbar>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)]">
          <div className="overflow-hidden rounded-xl border bg-card">
            <nav
              aria-label="Edit path"
              className="flex min-h-11 items-center gap-1 overflow-x-auto border-b px-2"
            >
              <Button
                onClick={() => setEditorPath([])}
                size="sm"
                type="button"
                variant={editorState.path.length ? "ghost" : "secondary"}
              >
                Start
              </Button>
              {editorState.path.map((nodeId, index) => {
                const node = tree.nodes.find(({ id }) => id === nodeId);
                if (!node) return null;
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

            <div className="space-y-5 p-3">
              {editorState.activeNode ? (
                <div className="space-y-2">
                  <Input
                    aria-label="Answer"
                    className="font-medium"
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
                  <div className="min-h-36 rounded-lg border bg-background p-3">
                    <Document
                      ariaLabel={`${editorState.activeNode.name} content`}
                      onChange={(document) =>
                        updateTree(
                          updateDecisionDocument(
                            tree,
                            editorState.activeNode!.id,
                            document,
                          ),
                        )
                      }
                      value={editorState.activeNode.document}
                    />
                  </div>
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
                      onDelete={() => {
                        const deleted = deleteDecisionNode(tree, node.id);
                        updateTree(deleted.tree);
                        setEditorPath((path) =>
                          removeDecisionTreeNodesFromPath(
                            path,
                            deleted.removed,
                          ),
                        );
                        setPreviewPath((path) =>
                          removeDecisionTreeNodesFromPath(
                            path,
                            deleted.removed,
                          ),
                        );
                      }}
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
                  placeholder="Add answer"
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
          </div>

          <VisitorFlow
            Document={Document}
            path={previewPath}
            setPath={setPreviewPath}
            tree={tree}
          />
        </div>
      </BlockShell>
    );
  },
});
