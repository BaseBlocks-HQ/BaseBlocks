"use client";

import { EditableTabs } from "@/modules/site-elements/shared/editable-tabs";
import { TabsModeToggle } from "@/modules/site-elements/shared/tabs-mode-toggle";
import type { ElementEditorProps } from "@/modules/site-elements/manifest";
import { useAutoSave } from "@/modules/site-elements/shared/use-auto-save";
import type {
  DecisionTree,
  DecisionTreeContent,
  DecisionTreeNode,
} from "@baseblocks/domain/elements";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { MousePointerClick } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { DecisionTreeBreadcrumbNav } from "./components/decision-tree-breadcrumb";
import { NodeDetail } from "./editor/node-detail";
import { NodeList } from "./editor/node-list";
import { useTreeNavigation } from "./editor/use-tree-navigation";
import { createDecisionTreeNodeId, insertParentForNode } from "./lib";

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
  const t = useTranslations("elements.decisionTree");
  return (
    <EditableTabs
      activeId={activeTreeId}
      addLabel={t("addTree")}
      endContent={
        !isMobile ? (
          <TabsModeToggle
            mode={tabsMode}
            horizontalLabel={t("tabsHorizontal")}
            dropdownLabel={t("tabsDropdown")}
            onChange={onTabsModeChange}
          />
        ) : undefined
      }
      items={trees.map((tree) => ({ id: tree.id, label: tree.label }))}
      onActiveChange={onSwitchTree}
      onAdd={onAddTree}
      onRemove={onRemoveTree}
      onRename={onRenameTree}
      removeLabel={t("removeTree")}
      renameLabel={t("renameTree")}
      tabsMode={tabsMode}
    />
  );
}

function EmptyNodeDetailState() {
  const t = useTranslations("elements.decisionTree");
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-9 items-center justify-center rounded-full bg-muted/50">
        <MousePointerClick className="size-4 text-muted-foreground" />
      </div>
      <p className="max-w-[18rem] text-sm text-muted-foreground">
        {t("emptyDetailSubtitle")}
      </p>
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
      <div className="flex flex-col overflow-hidden rounded-lg border border-border/70 bg-muted/10 shadow-xs">
        {treeTabs}
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-1 p-1">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs">
              {breadcrumbNav}
              <div className="min-h-0 flex-1">{nodeListPanel}</div>
            </div>
            {currentNode ? (
              <div className="overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs">
                {nodeDetailPanel}
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-border/70 bg-transparent shadow-xs"
      style={{ height: "500px" }}
    >
      {treeTabs}
      <div className="flex-1 min-h-0 min-w-0 overflow-hidden px-1 pb-1 pt-0.5">
        <ResizablePanelGroup
          orientation="horizontal"
          className="h-full min-w-0"
        >
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs">
              {breadcrumbNav}
              <div className="min-h-0 flex-1">{nodeListPanel}</div>
            </div>
          </ResizablePanel>
          <ResizableHandle className="w-1 cursor-col-resize bg-transparent after:hidden focus-visible:ring-0" />
          <ResizablePanel defaultSize={60} minSize={35}>
            <div className="h-full min-w-0 overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs">
              {nodeDetailPanel}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

export function DecisionTreeEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"decision-tree">) {
  const t = useTranslations("elements.decisionTree");
  const isMobile = useIsMobile();
  const [trees, setTrees] = useState<DecisionTree[]>(() => content.trees ?? []);
  const [activeTreeId, setActiveTreeId] = useState<string>(
    () => (content.trees ?? [])[0]?.id ?? "",
  );
  const [autoEditNodeId, setAutoEditNodeId] = useState<string | null>(null);
  const [tabsMode, setTabsMode] = useState<"row" | "dropdown">(
    content.tabsMode ?? "row",
  );
  const tabsModeRef = useRef<"row" | "dropdown">(content.tabsMode ?? "row");

  const { path, currentParentId, navigateInto, navigateToIndex } =
    useTreeNavigation();

  const resolvedActiveTreeId = trees.find((t) => t.id === activeTreeId)
    ? activeTreeId
    : (trees[0]?.id ?? "");
  const activeTree =
    trees.find((t) => t.id === resolvedActiveTreeId) ?? trees[0]!;
  const debouncedSave = useAutoSave(onUpdate, onSaveStatusChange);

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
      t.id === resolvedActiveTreeId ? { ...t, nodes: newNodes } : t,
    );
    updateTrees(updatedTrees);
  };

  const addTree = () => {
    const newTree: DecisionTree = {
      id: generateTreeId(),
      label: t("defaultTreeLabel", { number: trees.length + 1 }),
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
    tabsModeRef.current = mode;
    saveContent(trees);
  };

  const handleAddNode = (parentId: string | null, name: string) => {
    const nodes = activeTree.nodes;
    const siblings = nodes.filter((n) => n.parentId === parentId);
    const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), -1);
    const newNode: DecisionTreeNode = {
      id: createDecisionTreeNodeId(),
      parentId,
      name,
      order: maxOrder + 1,
      document: [],
    };
    updateActiveTreeNodes([...nodes, newNode]);
  };

  const handleAddParentNode = (nodeId: string) => {
    const result = insertParentForNode(activeTree.nodes, nodeId);
    if (!result.parentId) {
      return;
    }

    setAutoEditNodeId(result.parentId);
    updateActiveTreeNodes(result.nodes);
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
    activeTree.nodes.find((n) => n.id === nodeId)?.name ?? t("ellipsisName");

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
          trees.map((tree) => (tree.id === treeId ? { ...tree, label } : tree)),
        );
      }}
      onSwitchTree={switchTree}
      onTabsModeChange={handleTabsModeChange}
      tabsMode={tabsMode}
      trees={trees}
    />
  );

  const breadcrumbNav =
    path.length > 0 ? (
      <DecisionTreeBreadcrumbNav
        getNodeName={getNodeName}
        onNavigateToIndex={navigateToIndex}
        path={path}
      />
    ) : null;

  const nodeListPanel = (
    <NodeList
      autoEditNodeId={autoEditNodeId}
      nodes={activeTree.nodes}
      parentId={currentParentId}
      onAddParentNode={handleAddParentNode}
      onNavigateInto={navigateInto}
      onAddNode={handleAddNode}
      onUpdateNode={handleUpdateNode}
      onAutoEditHandled={() => setAutoEditNodeId(null)}
      onRemoveNode={handleRemoveNode}
      onReorderNodes={handleReorderNodes}
    />
  );

  const nodeDetailPanel = currentNode ? (
    <NodeDetail
      key={currentNode.id}
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
