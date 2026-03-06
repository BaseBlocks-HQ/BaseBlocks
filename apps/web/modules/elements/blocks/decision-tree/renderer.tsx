"use client";

import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { DecisionTreeBreadcrumb } from "./components/decision-tree-breadcrumb";
import {
  DecisionTreeDetailPrompt,
  DecisionTreeEmptyState,
  DecisionTreeEndState,
} from "./components/decision-tree-empty-state";
import {
  DecisionTreeCenteredPanel,
  DecisionTreeMobileDetail,
  DecisionTreeOptionsPanel,
  DecisionTreeSplitPanel,
} from "./components/decision-tree-layout";
import { DecisionTreeSelector } from "./components/decision-tree-selector";
import { useTreeNavigation } from "./editor/use-tree-navigation";
import { nodeHasContent } from "./lib";
import { DetailPanel } from "./viewer/detail-panel";
import { OptionList } from "./viewer/option-list";

export function DecisionTreeRenderer({
  content,
}: ElementRendererProps<"decision-tree">) {
  const isMobile = useIsMobile();
  const trees = content.trees ?? [];
  const [activeTreeId, setActiveTreeId] = useState<string>(trees[0]!.id);

  const activeTree =
    trees.find((tree) => tree.id === activeTreeId) ?? trees[0]!;
  const nodes = activeTree.nodes;
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

  const visibleNodes = nodes
    .filter((node) => node.parentId === currentParentId)
    .sort((a, b) => a.order - b.order);
  const activeNodeId = path.length > 0 ? path[path.length - 1] : null;
  const detailNodeId = selectedNodeId ?? activeNodeId;
  const detailNode = detailNodeId
    ? (nodes.find((node) => node.id === detailNodeId) ?? null)
    : null;
  const hasDetailContent = detailNode && nodeHasContent(detailNode);
  const isInitialState = path.length === 0 && selectedNodeId === null;
  const showMobileDetail =
    isMobile && selectedNodeId && detailNode && hasDetailContent;

  const handleSelectNode = (node: DecisionTreeNode) => {
    const hasChildren = nodes.some(
      (candidate) => candidate.parentId === node.id,
    );
    if (hasChildren) {
      navigateInto(node.id);
      return;
    }
    selectNode(node.id);
  };

  const getNodeName = (nodeId: string) =>
    nodes.find((node) => node.id === nodeId)?.name ?? "...";

  const handleSelectTree = (treeId: string) => {
    if (treeId !== activeTreeId) {
      setActiveTreeId(treeId);
      navigateToIndex(0);
    }
  };

  const handleStartOver = () => {
    navigateToIndex(0);
    selectNode(null);
  };

  const selector = (
    <DecisionTreeSelector
      trees={trees.map((tree) => ({ id: tree.id, label: tree.label }))}
      activeTreeId={activeTree.id}
      tabsMode={tabsMode}
      onSelectTree={handleSelectTree}
    />
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
        <DecisionTreeBreadcrumb
          path={path}
          getNodeName={getNodeName}
          onNavigateToIndex={navigateToIndex}
        />
      </div>
    ) : null;

  if (isMobile) {
    if (showMobileDetail) {
      return (
        <DecisionTreeMobileDetail
          selector={selector}
          title={detailNode.name}
          onBack={() => selectNode(null)}
        >
          <DetailPanel node={detailNode} />
        </DecisionTreeMobileDetail>
      );
    }

    return (
      <DecisionTreeOptionsPanel
        selector={selector}
        navigationBar={navigationBar}
      >
        {visibleNodes.length > 0 ? (
          <OptionList
            nodes={visibleNodes}
            allNodes={nodes}
            onSelect={handleSelectNode}
            selectedNodeId={selectedNodeId}
          />
        ) : isInitialState ? (
          <DecisionTreeEmptyState />
        ) : (
          <DecisionTreeEndState onStartOver={handleStartOver} />
        )}
      </DecisionTreeOptionsPanel>
    );
  }

  if (isInitialState) {
    return (
      <DecisionTreeCenteredPanel selector={selector}>
        {visibleNodes.length > 0 ? (
          <OptionList
            nodes={visibleNodes}
            allNodes={nodes}
            onSelect={handleSelectNode}
          />
        ) : (
          <DecisionTreeEmptyState />
        )}
      </DecisionTreeCenteredPanel>
    );
  }

  return (
    <DecisionTreeSplitPanel
      selector={selector}
      navigationBar={navigationBar}
      options={
        visibleNodes.length > 0 ? (
          <OptionList
            nodes={visibleNodes}
            allNodes={nodes}
            onSelect={handleSelectNode}
            selectedNodeId={selectedNodeId}
            compact
          />
        ) : (
          <DecisionTreeEndState onStartOver={handleStartOver} />
        )
      }
      detail={
        hasDetailContent && detailNode ? (
          <DetailPanel node={detailNode} />
        ) : (
          <DecisionTreeDetailPrompt />
        )
      }
    />
  );
}
