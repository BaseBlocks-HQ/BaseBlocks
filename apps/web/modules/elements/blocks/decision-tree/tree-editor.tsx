"use client";

import { EditableTabs } from "@/modules/elements/components/editable-tabs";
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
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Plus,
} from "lucide-react";
import { useOptimistic } from "react";
import { NodeDetail } from "./editor/node-detail";
import { NodeList } from "./editor/node-list";
import { useTreeNavigation } from "./editor/use-tree-navigation";

function generateTreeId() {
  return Math.random().toString(36).slice(2, 9);
}

function TreeTabsBar({
  activeTreeId,
  isMobile,
  onAddTree,
  onRemoveTree,
  onRenameTree,
  onSwitchTree,
  onTabsModeChange,
  tabsMode,
  trees,
}: {
  activeTreeId: string;
  isMobile: boolean;
  onAddTree: () => void;
  onRemoveTree?: (treeId: string) => void;
  onRenameTree: (treeId: string, label: string) => void;
  onSwitchTree: (treeId: string) => void;
  onTabsModeChange: (mode: "row" | "dropdown") => void;
  tabsMode: "row" | "dropdown";
  trees: DecisionTree[];
}) {
  return (
    <EditableTabs
      activeId={activeTreeId}
      addLabel="Add tree"
      endContent={
        !isMobile ? (
          <Select
            value={tabsMode}
            onValueChange={(value) =>
              onTabsModeChange(value as "row" | "dropdown")
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
        ) : undefined
      }
      items={trees.map((tree) => ({ id: tree.id, label: tree.label }))}
      onActiveChange={onSwitchTree}
      onAdd={onAddTree}
      onRemove={onRemoveTree}
      onRename={onRenameTree}
      removeLabel="Remove tree"
      renameLabel="Rename tree"
      tabsMode={tabsMode}
    />
  );
}

function TreeBreadcrumbNav({
  getNodeName,
  onNavigateToIndex,
  path,
}: {
  getNodeName: (nodeId: string) => string;
  onNavigateToIndex: (index: number) => void;
  path: string[];
}) {
  return (
    <div className="flex items-center gap-1.5 border-b px-3 py-2 bg-muted/20">
      {path.length > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 shrink-0"
          onClick={() => onNavigateToIndex(path.length - 1)}
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
                onClick={() => onNavigateToIndex(0)}
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
                          onClick={() => onNavigateToIndex(index + 1)}
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
                      onClick={() => onNavigateToIndex(index + 1)}
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
}

function EmptyNodeDetailState() {
  return (
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
}

function DecisionTreeWorkspace({
  breadcrumbNav,
  currentNode,
  isMobile,
  nodeDetailPanel,
  nodeListPanel,
  treeTabs,
}: {
  breadcrumbNav: React.ReactNode;
  currentNode: DecisionTreeNode | null;
  isMobile: boolean;
  nodeDetailPanel: React.ReactNode;
  nodeListPanel: React.ReactNode;
  treeTabs: React.ReactNode;
}) {
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

export function DecisionTreeEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"decision-tree">) {
  void id;
  const isMobile = useIsMobile();
  const [trees, setTrees] = useOptimistic<DecisionTree[]>(content.trees ?? []);
  const [activeTreeId, setActiveTreeId] = useOptimistic<string>(
    (content.trees ?? [])[0]?.id ?? "",
  );
  const [tabsMode, setTabsMode] = useOptimistic<"row" | "dropdown">(
    content.tabsMode ?? "row",
  );

  const { path, currentParentId, navigateInto, navigateToIndex } =
    useTreeNavigation();

  const resolvedActiveTreeId = trees.find((t) => t.id === activeTreeId)
    ? activeTreeId
    : trees[0]?.id ?? "";
  const activeTree =
    trees.find((t) => t.id === resolvedActiveTreeId) ?? trees[0]!;
  const debouncedSave = useAutoSave(onUpdate, onSaveStatusChange);

  const saveContent = (updatedTrees: DecisionTree[]) => {
    const newContent: DecisionTreeContent = {
      nodes: updatedTrees[0]?.nodes ?? [],
      trees: updatedTrees,
      tabsMode,
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
      t.id === resolvedActiveTreeId ? { ...t, nodes: newNodes } : t,
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
    if (resolvedActiveTreeId === treeId) {
      setActiveTreeId(updated[Math.min(idx, updated.length - 1)]!.id);
      navigateToIndex(0);
    }
    updateTrees(updated);
  };

  const switchTree = (treeId: string) => {
    if (treeId !== resolvedActiveTreeId) {
      setActiveTreeId(treeId);
      navigateToIndex(0);
    }
  };

  const handleTabsModeChange = (mode: "row" | "dropdown") => {
    setTabsMode(mode);
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
    <TreeTabsBar
      activeTreeId={resolvedActiveTreeId}
      isMobile={isMobile}
      onAddTree={addTree}
      onRemoveTree={trees.length > 1 ? removeTree : undefined}
      onRenameTree={(treeId, label) => {
        updateTrees(
          trees.map((tree) =>
            tree.id === treeId ? { ...tree, label } : tree,
          ),
        );
      }}
      onSwitchTree={switchTree}
      onTabsModeChange={handleTabsModeChange}
      tabsMode={tabsMode}
      trees={trees}
    />
  );

  const breadcrumbNav = (
    <TreeBreadcrumbNav
      getNodeName={getNodeName}
      onNavigateToIndex={navigateToIndex}
      path={path}
    />
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
    <EmptyNodeDetailState />
  );

  return (
    <DecisionTreeWorkspace
      breadcrumbNav={breadcrumbNav}
      currentNode={currentNode}
      isMobile={isMobile}
      nodeDetailPanel={nodeDetailPanel}
      nodeListPanel={nodeListPanel}
      treeTabs={treeTabs}
    />
  );
}
