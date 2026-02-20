"use client";

import type { ElementEditorProps } from "@/features/elements/registry";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import type {
  DecisionTree,
  DecisionTreeBlockType,
  DecisionTreeContent,
  DecisionTreeContentBlock,
  DecisionTreeNode,
} from "@baseblocks/types/elements";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@baseblocks/ui/breadcrumb";
import { Button } from "@baseblocks/ui/button";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Pencil,
  Plus,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { NodeDetail } from "./editor/node-detail";
import { NodeList } from "./editor/node-list";
import { useTreeNavigation } from "./editor/use-tree-navigation";

function generateTreeId() {
  return Math.random().toString(36).slice(2, 9);
}

function normalizeTrees(content: DecisionTreeContent): DecisionTree[] {
  if (content.trees && content.trees.length > 0) return content.trees;
  return [
    { id: generateTreeId(), label: "Tree 1", nodes: content.nodes || [] },
  ];
}

export function DecisionTreeEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"decision-tree">) {
  const isMobile = useIsMobile();
  const [trees, setTrees] = useState<DecisionTree[]>(() =>
    normalizeTrees(content),
  );
  const [activeTreeId, setActiveTreeId] = useState<string>(
    () => normalizeTrees(content)[0]!.id,
  );
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [tabsMode, setTabsMode] = useState<"row" | "dropdown">(
    content.tabsMode ?? "row",
  );
  const tabsModeRef = useRef<"row" | "dropdown">(content.tabsMode ?? "row");
  const labelInputRef = useRef<HTMLInputElement>(null);

  const { path, currentParentId, navigateInto, navigateToIndex } =
    useTreeNavigation();

  const activeTree = trees.find((t) => t.id === activeTreeId) ?? trees[0]!;

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (newContent: DecisionTreeContent) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate(newContent);
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          toast.error("Failed to save changes");
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, onSaveStatusChange],
    ),
    500,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset local state only when block id changes
  useEffect(() => {
    const normalized = normalizeTrees(content);
    setTrees(normalized);
    setTabsMode(content.tabsMode ?? "row");
    tabsModeRef.current = content.tabsMode ?? "row";
    if (!normalized.find((t) => t.id === activeTreeId)) {
      setActiveTreeId(normalized[0]!.id);
    }
  }, [id]);

  useEffect(() => {
    if (editingLabelId && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabelId]);

  // Sync active tab when trees change externally
  useEffect(() => {
    if (trees.length > 0 && !trees.find((t) => t.id === activeTreeId)) {
      setActiveTreeId(trees[0]!.id);
    }
  }, [trees, activeTreeId]);

  const saveContent = useCallback(
    (updatedTrees: DecisionTree[]) => {
      const newContent: DecisionTreeContent = {
        nodes: updatedTrees[0]?.nodes ?? [],
        trees: updatedTrees,
        tabsMode: tabsModeRef.current,
      };
      onSaveStatusChange?.("pending");
      debouncedSave(newContent);
    },
    [debouncedSave, onSaveStatusChange],
  );

  const updateTrees = useCallback(
    (updatedTrees: DecisionTree[]) => {
      setTrees(updatedTrees);
      saveContent(updatedTrees);
    },
    [saveContent],
  );

  const updateActiveTreeNodes = useCallback(
    (newNodes: DecisionTreeNode[]) => {
      const updatedTrees = trees.map((t) =>
        t.id === activeTreeId ? { ...t, nodes: newNodes } : t,
      );
      updateTrees(updatedTrees);
    },
    [trees, activeTreeId, updateTrees],
  );

  // --- Tree tab operations ---

  const addTree = useCallback(() => {
    const newTree: DecisionTree = {
      id: generateTreeId(),
      label: `Tree ${trees.length + 1}`,
      nodes: [],
    };
    setActiveTreeId(newTree.id);
    navigateToIndex(0);
    updateTrees([...trees, newTree]);
  }, [trees, updateTrees, navigateToIndex]);

  const removeTree = useCallback(
    (treeId: string) => {
      if (trees.length <= 1) return;
      const idx = trees.findIndex((t) => t.id === treeId);
      const updated = trees.filter((t) => t.id !== treeId);
      if (activeTreeId === treeId) {
        setActiveTreeId(updated[Math.min(idx, updated.length - 1)]!.id);
        navigateToIndex(0);
      }
      updateTrees(updated);
    },
    [trees, activeTreeId, updateTrees, navigateToIndex],
  );

  const startEditLabel = (treeId: string) => {
    const tree = trees.find((t) => t.id === treeId);
    if (!tree) return;
    setEditingLabelId(treeId);
    setEditingLabelValue(tree.label);
  };

  const commitEditLabel = () => {
    if (!editingLabelId) return;
    const label = editingLabelValue.trim() || "Untitled";
    updateTrees(
      trees.map((t) => (t.id === editingLabelId ? { ...t, label } : t)),
    );
    setEditingLabelId(null);
  };

  const switchTree = (treeId: string) => {
    if (treeId !== activeTreeId) {
      setActiveTreeId(treeId);
      navigateToIndex(0);
    }
  };

  const handleTabsModeChange = (mode: "row" | "dropdown") => {
    setTabsMode(mode);
    tabsModeRef.current = mode;
    saveContent(trees);
  };

  // --- Node operations (operate on active tree's nodes) ---

  const handleAddNode = useCallback(
    (parentId: string | null, name: string) => {
      const nodes = activeTree.nodes;
      const siblings = nodes.filter((n) => n.parentId === parentId);
      const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), -1);
      const newNode: DecisionTreeNode = {
        id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        parentId,
        name,
        order: maxOrder + 1,
        contentBlocks: [],
      };
      updateActiveTreeNodes([...nodes, newNode]);
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, name: string) => {
      updateActiveTreeNodes(
        activeTree.nodes.map((n) => (n.id === nodeId ? { ...n, name } : n)),
      );
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleRemoveNode = useCallback(
    (nodeId: string) => {
      const nodes = activeTree.nodes;
      const idsToRemove = new Set<string>();
      const collect = (nid: string) => {
        idsToRemove.add(nid);
        for (const child of nodes.filter((n) => n.parentId === nid)) {
          collect(child.id);
        }
      };
      collect(nodeId);
      updateActiveTreeNodes(nodes.filter((n) => !idsToRemove.has(n.id)));
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleReorderNodes = useCallback(
    (parentId: string | null, orderedIds: string[]) => {
      updateActiveTreeNodes(
        activeTree.nodes.map((n) => {
          const idx = orderedIds.indexOf(n.id);
          return idx !== -1 ? { ...n, order: idx } : n;
        }),
      );
    },
    [activeTree, updateActiveTreeNodes],
  );

  // --- Content block operations ---

  const handleAddContentBlock = useCallback(
    (nodeId: string, type: DecisionTreeBlockType) => {
      const node = activeTree.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const maxOrder = node.contentBlocks.reduce(
        (max, b) => Math.max(max, b.order),
        -1,
      );
      const newBlock: DecisionTreeContentBlock = {
        id: `block-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type,
        content: DEFAULT_BLOCK_CONTENT[type],
        order: maxOrder + 1,
      };
      updateActiveTreeNodes(
        activeTree.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, contentBlocks: [...n.contentBlocks, newBlock] }
            : n,
        ),
      );
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleUpdateContentBlock = useCallback(
    (nodeId: string, block: DecisionTreeContentBlock) => {
      updateActiveTreeNodes(
        activeTree.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                contentBlocks: n.contentBlocks.map((b) =>
                  b.id === block.id ? block : b,
                ),
              }
            : n,
        ),
      );
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleRemoveContentBlock = useCallback(
    (nodeId: string, blockId: string) => {
      updateActiveTreeNodes(
        activeTree.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                contentBlocks: n.contentBlocks.filter((b) => b.id !== blockId),
              }
            : n,
        ),
      );
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleReorderContentBlocks = useCallback(
    (nodeId: string, orderedIds: string[]) => {
      updateActiveTreeNodes(
        activeTree.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                contentBlocks: n.contentBlocks.map((b) => {
                  const idx = orderedIds.indexOf(b.id);
                  return idx !== -1 ? { ...b, order: idx } : b;
                }),
              }
            : n,
        ),
      );
    },
    [activeTree, updateActiveTreeNodes],
  );

  const handleUpdateNodeName = useCallback(
    (nodeId: string, name: string) => {
      handleUpdateNode(nodeId, name);
    },
    [handleUpdateNode],
  );

  const getNodeName = (nodeId: string) =>
    activeTree.nodes.find((n) => n.id === nodeId)?.name ?? "...";

  const currentNode = currentParentId
    ? (activeTree.nodes.find((n) => n.id === currentParentId) ?? null)
    : null;

  // --- Shared UI pieces ---

  const treeTabs = (
    <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 border-b bg-muted/30">
      {tabsMode === "dropdown" ? (
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {editingLabelId === activeTree.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                commitEditLabel();
              }}
              className="flex items-center gap-1 min-w-0 flex-1"
            >
              <input
                ref={labelInputRef}
                value={editingLabelValue}
                onChange={(e) => setEditingLabelValue(e.target.value)}
                onBlur={commitEditLabel}
                className="h-8 flex-1 rounded-md border bg-background px-2 text-xs"
              />
              <button
                type="submit"
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              >
                <Check className="h-3 w-3" />
              </button>
            </form>
          ) : (
            <Select value={activeTreeId} onValueChange={switchTree}>
              <SelectTrigger className="h-8 min-w-0 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {trees.map((tree) => (
                  <SelectItem key={tree.id} value={tree.id}>
                    {tree.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <button
            type="button"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            onClick={() => startEditLabel(activeTree.id)}
            title="Rename tree"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {trees.length > 1 && (
            <button
              type="button"
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              onClick={() => removeTree(activeTree.id)}
              title="Remove tree"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={addTree}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Add tree"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
          {trees.map((tree) => (
            <div
              key={tree.id}
              className={`group/tab flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                tree.id === activeTreeId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
              onClick={() => switchTree(tree.id)}
            >
              {editingLabelId === tree.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    commitEditLabel();
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    ref={labelInputRef}
                    value={editingLabelValue}
                    onChange={(e) => setEditingLabelValue(e.target.value)}
                    onBlur={commitEditLabel}
                    className="bg-transparent border-none outline-none w-20 text-xs text-inherit"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    type="submit"
                    className="p-0.5 rounded hover:bg-white/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </button>
                </form>
              ) : (
                <>
                  <span
                    className="max-w-[9rem] truncate"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startEditLabel(tree.id);
                    }}
                  >
                    {tree.label}
                  </span>
                  <button
                    type="button"
                    className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditLabel(tree.id);
                    }}
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  {trees.length > 1 && (
                    <button
                      type="button"
                      className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-white/20"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTree(tree.id);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addTree}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            title="Add tree"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {!isMobile && (
        <Select
          value={tabsMode}
          onValueChange={(value) =>
            handleTabsModeChange(value as "row" | "dropdown")
          }
        >
          <SelectTrigger className="h-8 w-[160px] text-xs shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row">Horizontal Row</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );

  const breadcrumbNav = (
    <div className="flex items-center gap-1.5 border-b px-3 py-2 bg-muted/20">
      {path.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => navigateToIndex(path.length - 1)}
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      )}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {path.length > 0 ? (
              <BreadcrumbLink
                className="cursor-pointer text-xs"
                onClick={() => navigateToIndex(0)}
              >
                Root
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage className="text-xs">Root</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {path.map((nodeId, index) => (
            <span key={nodeId} className="contents">
              <BreadcrumbSeparator>
                <ChevronRight className="size-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {index === path.length - 1 ? (
                  <BreadcrumbPage className="text-xs truncate max-w-[120px]">
                    {getNodeName(nodeId)}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="cursor-pointer text-xs truncate max-w-[120px]"
                    onClick={() => navigateToIndex(index + 1)}
                  >
                    {getNodeName(nodeId)}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );

  const nodeListPanel = (
    <NodeList
      nodes={activeTree.nodes}
      parentId={currentParentId}
      onNavigateInto={navigateInto}
      onAddNode={handleAddNode}
      onUpdateNode={handleUpdateNode}
      onRemoveNode={handleRemoveNode}
      onReorderNodes={handleReorderNodes}
    />
  );

  const nodeDetailPanel = currentNode ? (
    <NodeDetail
      node={currentNode}
      onUpdateNodeName={handleUpdateNodeName}
      onUpdateContentBlock={handleUpdateContentBlock}
      onAddContentBlock={handleAddContentBlock}
      onRemoveContentBlock={handleRemoveContentBlock}
      onReorderContentBlocks={handleReorderContentBlocks}
    />
  ) : (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
      <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center">
        <MousePointerClick className="size-5 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          Navigate into an option
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Select an option to edit its content
        </p>
      </div>
    </div>
  );

  // === MOBILE LAYOUT ===
  if (isMobile) {
    return (
      <div className="flex flex-col border rounded-lg overflow-hidden">
        {treeTabs}
        {breadcrumbNav}

        <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
          {/* Node list (options at current level) */}
          <div className="border-b">{nodeListPanel}</div>

          {/* Node detail (content of the node we navigated into) */}
          {currentNode && <div>{nodeDetailPanel}</div>}
        </div>
      </div>
    );
  }

  // === DESKTOP LAYOUT ===
  return (
    <div
      className="flex flex-col border rounded-lg overflow-hidden"
      style={{ height: "500px" }}
    >
      {treeTabs}
      {breadcrumbNav}

      {/* Split Panel */}
      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          {/* Left: Node List */}
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full min-w-0 border-r overflow-hidden">
              {nodeListPanel}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          {/* Right: Node Detail */}
          <ResizablePanel defaultSize={60} minSize={35}>
            <div className="h-full min-w-0 overflow-hidden">
              {nodeDetailPanel}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
