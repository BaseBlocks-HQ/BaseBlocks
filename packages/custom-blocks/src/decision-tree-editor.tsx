"use client";

import {
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  Copy01Icon,
  Delete01Icon,
  DragDropVerticalIcon,
  InformationCircleIcon,
  PencilEdit01Icon,
  Tick01Icon,
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
import { MiddleTruncate } from "@baseblocks/ui/middle-truncate";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
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
} from "@openeditor/document";
import { Fragment, type RefObject, useMemo, useRef, useState } from "react";
import {
  addDecisionNode,
  addDecisionTree,
  deleteDecisionNode,
  deleteDecisionTree,
  duplicateDecisionTree,
  renameDecisionTree,
  reorderDecisionTrees,
  updateDecisionDocument,
  updateDecisionTree,
  type DecisionNode,
  type DecisionTree,
} from "./decision-tree";
import {
  previousDecisionTreePath,
  removeDecisionTreeNodesFromPath,
  reorderDecisionTreeSiblings,
  resolveDecisionTree,
} from "./decision-tree-navigation";
import { decisionTreeBlock } from "./index";
import { DecisionTreeState } from "./decision-tree-state";
import { ActionMenu, BlockShell, CollectionMenu } from "./ui";

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
  suppressMenuClick,
  total,
}: {
  index: number;
  node: DecisionNode;
  onDelete: () => void;
  onOpen: () => void;
  onRename: (name: string) => void;
  suppressMenuClick: RefObject<boolean>;
  total: number;
}) {
  const [renaming, setRenaming] = useState(false);
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
      className={`group grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-center rounded-xl hover:bg-muted/40 ${sortable.isDropTarget ? "bg-muted/60" : ""} ${sortable.isDragging ? "opacity-40" : ""}`}
      ref={sortable.ref}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center">
        <ActionMenu
          items={[
            {
              icon: PencilEdit01Icon,
              label: "Rename answer",
              onSelect: () => setRenaming(true),
            },
            {
              destructive: true,
              icon: Delete01Icon,
              label: "Delete answer",
              onSelect: onDelete,
              separatorBefore: true,
            },
          ]}
          label={`Answer ${index + 1} actions`}
          trigger={
            <Button
              aria-label={`${label}. Select for actions.`}
              className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
              onClickCapture={(event) => {
                if (!suppressMenuClick.current) return;
                event.preventDefault();
                event.stopPropagation();
                suppressMenuClick.current = false;
              }}
              ref={sortable.handleRef}
              size="icon-sm"
              title={`${label}. Select for actions.`}
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden icon={DragDropVerticalIcon} />
            </Button>
          }
        />
      </div>
      {renaming ? (
        <Input
          aria-label={`Rename ${node.name}`}
          autoFocus
          className="min-w-0 flex-1 border-transparent !bg-transparent font-medium shadow-none focus-visible:!bg-background"
          defaultValue={node.name}
          onBeforeInputCapture={(event) => event.stopPropagation()}
          onBlur={(event) => {
            const nextName = event.currentTarget.value;
            if (nextName !== node.name) onRename(nextName);
            setRenaming(false);
          }}
          onInputCapture={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setRenaming(false);
            }
          }}
        />
      ) : (
        <button
          aria-label={node.name}
          className="flex h-10 min-w-0 items-center justify-between gap-2 rounded-lg pe-2 ps-1 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onOpen}
          title={node.name}
          type="button"
        >
          <MiddleTruncate className="flex-1" text={node.name} />
          <HugeiconsIcon
            aria-hidden
            className="size-4 shrink-0 text-muted-foreground"
            icon={ArrowRight01Icon}
          />
        </button>
      )}
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
    return node ? [{ index, node }] : [];
  });
  const collapsed = steps.length > 3;
  const hidden = collapsed ? steps.slice(0, -2) : [];
  const visible = collapsed ? steps.slice(-2) : steps;
  const atStart = path.length === 0;

  return (
    <Breadcrumb className="min-w-0" aria-label="Edit path">
      <BreadcrumbList className="flex-nowrap gap-1 overflow-hidden text-xs sm:gap-1.5">
        <BreadcrumbItem className="min-w-0">
          {atStart ? (
            <BreadcrumbPage className="font-medium">Start</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <button
                className="font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                      className="max-w-28 truncate underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
  const state = useMemo(
    () => resolveDecisionTree(tree.nodes, path),
    [tree, path],
  );
  return (
    <aside
      aria-label="Decision tree preview"
      className="flex h-[32rem] min-w-0 flex-col overflow-hidden bg-muted/20 p-4 sm:p-6"
    >
      <div className="flex shrink-0 justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              aria-label="About preview"
              className="text-muted-foreground"
              size="icon-xs"
              type="button"
              variant="ghost"
            >
              <HugeiconsIcon aria-hidden icon={InformationCircleIcon} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            This shows what visitors see on the published site.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center">
        {state.activeNode ? (
          <h3 className="mb-4 shrink-0 text-balance text-center text-xl font-semibold leading-tight sm:text-2xl">
            {getDocumentText(state.activeNode.document) || "Untitled step"}
          </h3>
        ) : null}
        {state.visibleOptions.length > 0 ? (
          <nav
            aria-label="Decision options"
            className="grid min-h-0 min-w-0 gap-2 overflow-y-auto overscroll-contain"
          >
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
          </nav>
        ) : (
          <DecisionTreeState
            className="min-h-0 flex-1"
            variant={state.activeNode ? "result" : "preview"}
          />
        )}
      </div>
      {state.path.length > 1 || path.length > 0 ? (
        <button
          className="mx-auto mt-4 flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => {
            setPath(previousDecisionTreePath(state.path));
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
    const [addingAnswer, setAddingAnswer] = useState(false);
    const suppressMenuClick = useRef(false);
    const tree = data.trees.find(({ id }) => id === treeId) ?? data.trees[0];
    const editorState = useMemo(
      () => resolveDecisionTree(tree?.nodes ?? [], editorPath),
      [tree, editorPath],
    );
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
      setAddingAnswer(false);
      setEditorPath([...editorState.path, id]);
    };
    const isQuestion = editorState.visibleOptions.length > 0;
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
      <BlockShell label="Edit decision tree">
        <div className="flex min-w-0 items-center px-1">
          {renaming ? (
            <Input
              aria-label="Decision tree name"
              autoFocus
              className="min-w-36 max-w-72 bg-background font-semibold"
              defaultValue={tree.label}
              onBeforeInputCapture={(event) => event.stopPropagation()}
              onBlur={(event) => {
                const nextLabel = event.currentTarget.value;
                if (nextLabel !== tree.label) {
                  updateDataJson(renameDecisionTree(data, tree.id, nextLabel));
                }
                setRenaming(false);
              }}
              onInputCapture={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                } else if (event.key === "Escape") {
                  event.preventDefault();
                  setRenaming(false);
                }
              }}
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
                  icon: PencilEdit01Icon,
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
              onReorder={(sourceId, targetId) =>
                updateDataJson(reorderDecisionTrees(data, sourceId, targetId))
              }
              options={data.trees}
              valueLabel={tree.label}
            />
          )}
        </div>

        <div className="grid min-w-0 overflow-hidden rounded-[1.5rem] bg-card lg:grid-cols-2">
          <section className="flex h-[32rem] min-w-0 flex-col overflow-hidden bg-card p-3 sm:p-4">
            <div className="mb-3 min-h-8 shrink-0 px-1 py-0.5">
              <DecisionBreadcrumb
                path={editorState.path}
                setPath={setEditorPath}
                tree={tree}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3">
              {editorState.activeNode ? (
                <div className="shrink-0">
                  <label
                    className="block text-xs font-medium text-muted-foreground"
                    htmlFor={`${editorState.activeNode.id}-prompt`}
                  >
                    {isQuestion ? "Question" : "Result"}
                    <Input
                      aria-label={isQuestion ? "Question" : "Result"}
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
                    {!isQuestion ? (
                      <span className="mt-1.5 block text-xs font-normal text-muted-foreground">
                        With no answers, this step is the final result.
                      </span>
                    ) : null}
                  </label>
                </div>
              ) : null}

              <DragDropProvider
                sensors={sensors}
                onDragStart={() => {
                  suppressMenuClick.current = true;
                }}
                onDragEnd={(event) => {
                  window.setTimeout(() => {
                    suppressMenuClick.current = false;
                  }, 250);
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
                <div
                  className={`grid min-h-0 flex-1 overflow-y-auto overscroll-contain pe-1 ${
                    editorState.visibleOptions.length > 0
                      ? "content-start"
                      : "place-items-center"
                  }`}
                >
                  {editorState.visibleOptions.length > 0 ? (
                    editorState.visibleOptions.map((node, index) => (
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
                        suppressMenuClick={suppressMenuClick}
                        total={editorState.visibleOptions.length}
                      />
                    ))
                  ) : (
                    <DecisionTreeState
                      className="w-full"
                      variant={editorState.activeNode ? "answers" : "steps"}
                    />
                  )}
                </div>
              </DragDropProvider>

              {addingAnswer ? (
                <div className="relative shrink-0 rounded-xl bg-muted/35 p-1">
                  <Input
                    aria-label="New answer"
                    autoFocus
                    className="border-0 bg-transparent pe-16 shadow-none focus-visible:bg-background"
                    onChange={(event) => setNewAnswer(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setNewAnswer("");
                        setAddingAnswer(false);
                        return;
                      }
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      addAnswer();
                    }}
                    placeholder={
                      editorState.activeNode
                        ? "Answer label"
                        : "Starting step label"
                    }
                    value={newAnswer}
                  />
                  <div className="absolute inset-y-1 end-1 flex items-center gap-0.5">
                    <Button
                      aria-label="Cancel"
                      className="text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
                      onClick={() => {
                        setNewAnswer("");
                        setAddingAnswer(false);
                      }}
                      size="icon-xs"
                      title="Cancel"
                      type="button"
                      variant="ghost"
                    >
                      <HugeiconsIcon aria-hidden icon={Cancel01Icon} />
                    </Button>
                    <Button
                      aria-label={
                        editorState.activeNode ? "Add answer" : "Add step"
                      }
                      className="text-muted-foreground hover:bg-transparent hover:text-foreground dark:hover:bg-transparent"
                      disabled={!newAnswer.trim()}
                      onClick={addAnswer}
                      size="icon-xs"
                      title={editorState.activeNode ? "Add answer" : "Add step"}
                      type="button"
                      variant="ghost"
                    >
                      <HugeiconsIcon aria-hidden icon={Tick01Icon} />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setAddingAnswer(true)}
                  type="button"
                >
                  <HugeiconsIcon aria-hidden icon={Add01Icon} />
                  {editorState.activeNode ? "Add answer" : "Add starting step"}
                </button>
              )}
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
