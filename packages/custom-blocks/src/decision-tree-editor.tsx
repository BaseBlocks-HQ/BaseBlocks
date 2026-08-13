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
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
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
import { Fragment, useMemo, useState } from "react";
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
      className={`flex min-w-0 items-center gap-1 py-1 ${sortable.isDropTarget ? "bg-muted/60" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
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
        className="min-w-0 flex-1 border-transparent !bg-transparent font-medium shadow-none hover:!bg-muted/40 focus-visible:!bg-background"
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

function DecisionBreadcrumb({
  path,
  setPath,
  tree,
}: {
  path: string[];
  setPath: (path: string[]) => void;
  tree: DecisionTree;
}) {
  const steps = path.flatMap((nodeId, index) => {
    const node = tree.nodes.find(({ id }) => id === nodeId);
    return node?.parentId ? [{ index, node }] : [];
  });
  const collapsed = steps.length > 3;
  const hidden = collapsed ? steps.slice(0, -2) : [];
  const visible = collapsed ? steps.slice(-2) : steps;
  const atStart = visible.length === 0;

  return (
    <Breadcrumb className="min-w-0" aria-label="Edit path">
      <BreadcrumbList className="flex-nowrap gap-1 overflow-hidden text-xs sm:gap-1.5">
        <BreadcrumbItem className="min-w-0">
          {atStart ? (
            <BreadcrumbPage className="px-1.5 py-1 font-medium">
              Start
            </BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <button
                className="rounded-md px-1.5 py-1 font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setPath([])}
                type="button"
              >
                Start
              </button>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>
        {collapsed ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Show earlier steps"
                    className="rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    type="button"
                  >
                    <BreadcrumbEllipsis className="size-7" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hidden.map(({ index, node }) => (
                    <DropdownMenuItem
                      key={node.id}
                      onSelect={() => setPath(path.slice(0, index + 1))}
                    >
                      {node.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
          </>
        ) : null}
        {visible.map(({ index, node }, visibleIndex) => {
          const current = visibleIndex === visible.length - 1;
          return (
            <Fragment key={node.id}>
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                {current ? (
                  <BreadcrumbPage className="max-w-32 truncate font-medium">
                    {node.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <button
                      className="max-w-28 truncate rounded-md px-1.5 py-1 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => setPath(path.slice(0, index + 1))}
                      type="button"
                    >
                      {node.name}
                    </button>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
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
      className="flex min-h-72 min-w-0 flex-col justify-center overflow-hidden border-t border-border/70 bg-muted/20 p-4 sm:p-6 lg:border-l lg:border-t-0"
    >
      {state.activeNode ? (
        <h3 className="mb-4 text-balance text-center text-xl font-semibold leading-tight sm:text-2xl">
          {getDocumentText(state.activeNode.document) || "Untitled step"}
        </h3>
      ) : null}
      <div className="grid min-w-0 gap-2">
        {state.visibleOptions.map((node) => (
          <button
            className="flex min-h-[52px] min-w-0 w-full items-center justify-between gap-3 rounded-2xl bg-card p-3 text-left hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          className="mx-auto mt-4 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          <section className="min-w-0 bg-card p-3 sm:p-4">
            <div className="mb-3 min-h-8 px-1 py-0.5">
              <DecisionBreadcrumb
                path={editorState.path}
                setPath={setEditorPath}
                tree={tree}
              />
            </div>

            <div className="space-y-4">
              {editorState.activeNode ? (
                <div className="space-y-3">
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
                <div className="grid">
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
