"use client";

import { useMemo } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ElementRendererProps } from "@/components/elements/registry";
import type { DecisionTreeNode } from "@/types/elements";
import { useTreeNavigation } from "./editor/use-tree-navigation";
import { OptionList } from "./viewer/option-list";
import { DetailPanel } from "./viewer/detail-panel";

export function DecisionTreeRenderer({
  content,
}: ElementRendererProps<"decision-tree">) {
  const { nodes } = content;

  const {
    path,
    currentParentId,
    selectedNodeId,
    selectNode,
    navigateInto,
    navigateBack,
    navigateToIndex,
  } = useTreeNavigation();

  const rootNodes = useMemo(
    () =>
      nodes
        .filter((n) => n.parentId === currentParentId)
        .sort((a, b) => a.order - b.order),
    [nodes, currentParentId],
  );

  const activeNodeId = path.length > 0 ? path[path.length - 1] : null;
  const detailNodeId = selectedNodeId ?? activeNodeId;
  const detailNode = detailNodeId
    ? nodes.find((n) => n.id === detailNodeId) ?? null
    : null;
  const hasDetailContent =
    detailNode && detailNode.contentBlocks.length > 0;

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

  // Initial state: show centered option list
  const isInitialState = path.length === 0 && selectedNodeId === null;

  if (isInitialState) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-full max-w-lg">
          <OptionList
            nodes={rootNodes}
            allNodes={nodes}
            onSelect={handleSelect}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Navigation Bar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-t-lg bg-primary text-primary-foreground">
        <Button
          variant="ghost"
          size="icon"
          onClick={navigateBack}
          className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="min-w-0">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto text-primary-foreground/50">
            <button
              type="button"
              className="hover:opacity-80 transition-opacity shrink-0"
              onClick={() => navigateToIndex(0)}
            >
              Root
            </button>
            {path.map((nodeId, index) => (
              <span key={nodeId} className="contents">
                <span className="shrink-0 text-primary-foreground/25">
                  /
                </span>
                {index === path.length - 1 ? (
                  <span className="font-medium truncate text-primary-foreground">
                    {getNodeName(nodeId)}
                  </span>
                ) : (
                  <button
                    type="button"
                    className="hover:opacity-80 transition-opacity truncate"
                    onClick={() => navigateToIndex(index + 1)}
                  >
                    {getNodeName(nodeId)}
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content Area */}
      {hasDetailContent ? (
        <div className="flex border rounded-b-lg min-h-[300px]">
          {/* Left: Options */}
          <div className="w-[35%] border-r overflow-y-auto">
            {rootNodes.length > 0 ? (
              <OptionList
                nodes={rootNodes}
                allNodes={nodes}
                onSelect={handleSelect}
                selectedNodeId={selectedNodeId}
                compact
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
                <CheckCircle2 className="size-5 text-primary" />
                <p className="text-muted-foreground text-sm px-4 text-center">
                  End of path
                </p>
              </div>
            )}
          </div>

          {/* Right: Detail */}
          <div className="flex-1 overflow-hidden">
            {detailNode && <DetailPanel node={detailNode} />}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center border rounded-b-lg min-h-[200px]">
          <div className="w-full max-w-lg px-6 py-6">
            {rootNodes.length > 0 ? (
              <OptionList
                nodes={rootNodes}
                allNodes={nodes}
                onSelect={handleSelect}
                selectedNodeId={selectedNodeId}
              />
            ) : (
              <div className="flex flex-col items-center gap-2 py-12">
                <CheckCircle2 className="size-5 text-primary" />
                <p className="text-muted-foreground text-sm text-center">
                  End of path
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
