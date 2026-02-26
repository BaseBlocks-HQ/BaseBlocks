"use client";

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import type {
  DecisionTree,
  DecisionTreeContent,
  DecisionTreeNode,
} from "@baseblocks/types/elements";
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
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
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
import { useEffect, useRef, useState } from "react";
import { NodeDetail } from "./editor/node-detail";
import { NodeList } from "./editor/node-list";
import { useTreeNavigation } from "./editor/use-tree-navigation";

function generateTreeId() {
  return Math.random().toString(36).slice(2, 9);
}

export function DecisionTreeEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"decision-tree">) {
  const isMobile = useIsMobile();
  const [trees, setTrees] = useState<DecisionTree[]>(() => content.trees ?? []);
  const [activeTreeId, setActiveTreeId] = useState<string>(
    () => (content.trees ?? [])[0]?.id ?? "",
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
  const debouncedSave = useAutoSave(onUpdate, onSaveStatusChange);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Reset local state only when block id changes
  useEffect(() => {
    const trees = content.trees ?? [];
    setTrees(trees);
    setTabsMode(content.tabsMode ?? "row");
    tabsModeRef.current = content.tabsMode ?? "row";
    if (!trees.find((t) => t.id === activeTreeId)) {
      setActiveTreeId(trees[0]?.id ?? "");
    }
  }, [id]);

  useEffect(() => {
    if (editingLabelId && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabelId]);

  useEffect(() => {
    if (trees.length > 0 && !trees.find((t) => t.id === activeTreeId)) {
      setActiveTreeId(trees[0]!.id);
    }
  }, [trees, activeTreeId]);

  const saveContent = (updatedTrees: DecisionTree[]) => {
    const newContent: DecisionTreeContent = {
      nodes: updatedTrees[0]?.nodes ?? [],
      trees: updatedTrees,
      tabsMode: tabsModeRef.current,
    };
    onSaveStatusChange?.("pending");
    debouncedSave(newContent);
  };

  const updateTrees = (updatedTrees: DecisionTree[]) => {
    setTrees(updatedTrees);
    saveContent(updatedTrees);
  };

  const updateActiveTreeNodes = (newNodes: DecisionTreeNode[]) => {
    const updatedTrees = trees.map((t) =>
      t.id === activeTreeId ? { ...t, nodes: newNodes } : t,
    );
    updateTrees(updatedTrees);
  };

  const addTree = () => {
    const newTree: DecisionTree = {
      id: generateTreeId(),
      label: `Tree ${trees.length + 1}`,
      nodes: [],
    };
    setActiveTreeId(newTree.id);
    navigateToIndex(0);
    updateTrees([...trees, newTree]);
  };

  const removeTree = (treeId: string) => {
    if (trees.length <= 1) return;
    const idx = trees.findIndex((t) => t.id === treeId);
    const updated = trees.filter((t) => t.id !== treeId);
    if (activeTreeId === treeId) {
      setActiveTreeId(updated[Math.min(idx, updated.length - 1)]!.id);
      navigateToIndex(0);
    }
    updateTrees(updated);
  };

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

  const handleAddNode = (parentId: string | null, name: string) => {
    const nodes = activeTree.nodes;
    const siblings = nodes.filter((n) => n.parentId === parentId);
    const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), -1);
    const newNode: DecisionTreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      parentId,
      name,
      order: maxOrder + 1,
      document: [],
    };
    updateActiveTreeNodes([...nodes, newNode]);
  };

  const handleUpdateNode = (nodeId: string, name: string) => {
    updateActiveTreeNodes(
      activeTree.nodes.map((n) => (n.id === nodeId ? { ...n, name } : n)),
    );
  };

  const handleRemoveNode = (nodeId: string) => {
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
  };

  const handleReorderNodes = (
    _parentId: string | null,
    orderedIds: string[],
  ) => {
    updateActiveTreeNodes(
      activeTree.nodes.map((n) => {
        const idx = orderedIds.indexOf(n.id);
        return idx !== -1 ? { ...n, order: idx } : n;
      }),
    );
  };

  const handleUpdateDocument = (nodeId: string, document: unknown[]) => {
    updateActiveTreeNodes(
      activeTree.nodes.map((n) => (n.id === nodeId ? { ...n, document } : n)),
    );
  };

  const handleUpdateNodeName = (nodeId: string, name: string) => {
    handleUpdateNode(nodeId, name);
  };

  const getNodeName = (nodeId: string) =>
    activeTree.nodes.find((n) => n.id === nodeId)?.name ?? "...";

  const currentNode = currentParentId
    ? (activeTree.nodes.find((n) => n.id === currentParentId) ?? null)
    : null;

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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  switchTree(tree.id);
                }
              }}
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
          {path.length >= 3 ? (
            <>
              <BreadcrumbSeparator>
                <ChevronRight className="size-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-6">
                      <BreadcrumbEllipsis className="size-4" />
                      <span className="sr-only">Show more</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      {path.slice(0, -1).map((nodeId, index) => (
                        <DropdownMenuItem
                          key={nodeId}
                          onClick={() => navigateToIndex(index + 1)}
                        >
                          {getNodeName(nodeId)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="size-3" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-xs truncate max-w-[120px]">
                  {getNodeName(path.at(-1) ?? "")}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          ) : (
            path.map((nodeId, index) => (
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
            ))
          )}
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
      onUpdateDocument={handleUpdateDocument}
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

  if (isMobile) {
    return (
      <div className="flex flex-col border rounded-lg overflow-hidden">
        {treeTabs}
        {breadcrumbNav}

        <div className="overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <div className="border-b">{nodeListPanel}</div>
          {currentNode && <div>{nodeDetailPanel}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col border rounded-lg overflow-hidden"
      style={{ height: "500px" }}
    >
      {treeTabs}
      {breadcrumbNav}

      <div className="flex-1 min-h-0">
        <ResizablePanelGroup orientation="horizontal" className="h-full">
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="h-full min-w-0 border-r overflow-hidden">
              {nodeListPanel}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
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
