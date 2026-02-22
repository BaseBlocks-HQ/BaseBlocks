"use client";

import { cn } from "@/lib/utils";
import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GitFork,
  MousePointerClick,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { useTreeNavigation } from "./editor/use-tree-navigation";
import { DetailPanel } from "./viewer/detail-panel";
import { OptionList } from "./viewer/option-list";

export function DecisionTreeRenderer({
  content,
}: ElementRendererProps<"decision-tree">) {
  const isMobile = useIsMobile();
  const trees = content.trees ?? [];
  const [activeTreeId, setActiveTreeId] = useState<string>(trees[0]!.id);

  const activeTree = trees.find((t) => t.id === activeTreeId) ?? trees[0]!;
  const nodes = activeTree.nodes;
  const showTabs = trees.length > 1;
  const tabsMode = content.tabsMode ?? "row";

  const {
    path,
    currentParentId,
    selectedNodeId,
    selectNode,
    navigateInto,
    navigateBack,
    navigateToIndex,
  } = useTreeNavigation();

  const rootNodes = nodes
    .filter((n) => n.parentId === currentParentId)
    .sort((a, b) => a.order - b.order);

  const activeNodeId = path.length > 0 ? path[path.length - 1] : null;
  const detailNodeId = selectedNodeId ?? activeNodeId;
  const detailNode = detailNodeId
    ? (nodes.find((n) => n.id === detailNodeId) ?? null)
    : null;
  const hasDetailContent = detailNode && detailNode.contentBlocks.length > 0;

  const handleSelect = (node: DecisionTreeNode) => {
    const hasChildren = nodes.some((n) => n.parentId === node.id);
    if (hasChildren) {
      navigateInto(node.id);
    } else {
      selectNode(node.id);
    }
  };

  const getNodeName = (nodeId: string) =>
    nodes.find((n) => n.id === nodeId)?.name ?? "...";

  const switchTree = (treeId: string) => {
    if (treeId !== activeTreeId) {
      setActiveTreeId(treeId);
      navigateToIndex(0);
    }
  };

  const handleStartOver = () => {
    navigateToIndex(0);
    selectNode(null);
  };

  const isInitialState = path.length === 0 && selectedNodeId === null;
  const showMobileDetail =
    isMobile && selectedNodeId && detailNode && hasDetailContent;

  // --- Shared sub-components ---

  const treeSelector = showTabs ? (
    <div
      className={cn(
        "border-b",
        tabsMode === "dropdown" ? "px-3 py-2" : "px-3 py-2",
      )}
    >
      {tabsMode === "dropdown" ? (
        <Select value={activeTree.id} onValueChange={switchTree}>
          <SelectTrigger className="h-9 w-full sm:w-[260px]">
            <SelectValue placeholder="Select tree" />
          </SelectTrigger>
          <SelectContent>
            {trees.map((tree) => (
              <SelectItem key={tree.id} value={tree.id}>
                {tree.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-1 overflow-x-auto">
          {trees.map((tree) => (
            <button
              key={tree.id}
              type="button"
              onClick={() => switchTree(tree.id)}
              className={cn(
                "max-w-[12rem] truncate rounded-md px-3 py-1 text-xs font-medium transition-colors shrink-0",
                tree.id === activeTree.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              {tree.label}
            </button>
          ))}
        </div>
      )}
    </div>
  ) : null;

  const breadcrumb = (
    <div className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto min-w-0">
      <button
        type="button"
        className="hover:text-foreground transition-colors shrink-0"
        onClick={() => navigateToIndex(0)}
      >
        Start
      </button>
      {path.map((nodeId, index) => (
        <span key={nodeId} className="contents">
          <ChevronRight className="size-3 shrink-0 text-muted-foreground/40" />
          {index === path.length - 1 ? (
            <span className="font-medium text-foreground truncate">
              {getNodeName(nodeId)}
            </span>
          ) : (
            <button
              type="button"
              className="hover:text-foreground transition-colors truncate"
              onClick={() => navigateToIndex(index + 1)}
            >
              {getNodeName(nodeId)}
            </button>
          )}
        </span>
      ))}
    </div>
  );

  const navigationBar =
    path.length > 0 ? (
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={navigateBack}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {breadcrumb}
      </div>
    ) : null;

  const endOfPath = (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
      <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="size-5 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">End of path</p>
        <p className="text-xs text-muted-foreground mt-1">
          No more options available
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleStartOver}
        className="mt-1"
      >
        <RotateCcw className="size-3.5 mr-1.5" />
        Start over
      </Button>
    </div>
  );

  // === MOBILE LAYOUT ===
  if (isMobile) {
    // Mobile: detail view (leaf selected with content)
    if (showMobileDetail) {
      return (
        <div className="border rounded-lg overflow-hidden">
          {treeSelector}
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0"
              onClick={() => selectNode(null)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium truncate">
              {detailNode.name}
            </span>
          </div>
          <DetailPanel node={detailNode} />
        </div>
      );
    }

    // Mobile: options view
    return (
      <div className="border rounded-lg overflow-hidden">
        {treeSelector}
        {navigationBar}
        <div className="p-3">
          {rootNodes.length > 0 ? (
            <OptionList
              nodes={rootNodes}
              allNodes={nodes}
              onSelect={handleSelect}
              selectedNodeId={selectedNodeId}
            />
          ) : isInitialState ? (
            <EmptyTree />
          ) : (
            endOfPath
          )}
        </div>
      </div>
    );
  }

  // === DESKTOP LAYOUT ===

  // Desktop: initial state — centered option list
  if (isInitialState) {
    return (
      <div className="border rounded-lg overflow-hidden">
        {treeSelector}
        <div className="flex items-center justify-center py-8">
          <div className="w-full max-w-lg px-4">
            {rootNodes.length > 0 ? (
              <OptionList
                nodes={rootNodes}
                allNodes={nodes}
                onSelect={handleSelect}
              />
            ) : (
              <EmptyTree />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: navigated state — split view
  return (
    <div className="border rounded-lg overflow-hidden">
      {treeSelector}
      {navigationBar}
      <div className="flex min-h-[300px]">
        {/* Left: Options sidebar */}
        <div className="w-[280px] shrink-0 border-r overflow-y-auto">
          {rootNodes.length > 0 ? (
            <OptionList
              nodes={rootNodes}
              allNodes={nodes}
              onSelect={handleSelect}
              selectedNodeId={selectedNodeId}
              compact
            />
          ) : (
            endOfPath
          )}
        </div>

        {/* Right: Detail content */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {hasDetailContent && detailNode ? (
            <DetailPanel node={detailNode} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
              <div className="size-10 rounded-full bg-muted/60 flex items-center justify-center">
                <MousePointerClick className="size-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Select an option
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  Choose from the list to view details
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyTree() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 px-4">
      <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center">
        <GitFork className="size-6 text-muted-foreground" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">
          No options configured
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          This decision tree doesn&apos;t have any options yet
        </p>
      </div>
    </div>
  );
}
