"use client";

import { ContentBlockRenderer } from "./content-block-renderer";
import type { DecisionTreeNode } from "@/types/elements";

interface DetailPanelProps {
  node: DecisionTreeNode;
}

export function DetailPanel({ node }: DetailPanelProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold text-primary">
          {node.name}
        </h2>
        <ContentBlockRenderer blocks={node.contentBlocks} />
      </div>
    </div>
  );
}
