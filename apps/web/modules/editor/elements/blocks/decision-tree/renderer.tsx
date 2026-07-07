"use client";

import type { ElementRendererProps } from "@/modules/editor/elements/framework/registry";
import type { DecisionTreeNode } from "@baseblocks/domain/elements";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useState } from "react";
import { DecisionTreeBreadcrumbNav } from "./components/decision-tree-breadcrumb";
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
      <DecisionTreeBreadcrumbNav
        path={path}
        getNodeName={getNodeName}
        onNavigateToIndex={navigateToIndex}
      />
    ) : null;

  const optionsContent =
    visibleNodes.length > 0 ? (
      <OptionList
        nodes={visibleNodes}
        allNodes={nodes}
        onSelect={handleSelectNode}
        selectedNodeId={selectedNodeId}
        compact={!isInitialState || !isMobile}
      />
    ) : isInitialState ? (
      <DecisionTreeEmptyState />
    ) : (
      <DecisionTreeEndState onStartOver={handleStartOver} />
    );

  const stackedOptionsPanel = (
    <div className="flex h-full min-h-0 flex-col">
      {navigationBar}
      <ScrollArea className="min-h-0 min-w-0 flex-1">
        <div className="max-w-full min-w-0 p-1">{optionsContent}</div>
      </ScrollArea>
    </div>
  );

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
      <DecisionTreeOptionsPanel selector={selector} navigationBar={undefined}>
        {stackedOptionsPanel}
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
            compact
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
      navigationBar={undefined}
      options={stackedOptionsPanel}
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
