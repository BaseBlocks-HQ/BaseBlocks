"use client";

import { ContentBlockRenderer } from "./content-block-renderer";
import type { DecisionTreeNode } from "@/types/elements";

interface DetailPanelProps {
  node: DecisionTreeNode;
}

export function DetailPanel({ node }: DetailPanelProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="px-5 py-5 space-y-4 sm:px-6 sm:py-6 sm:space-y-5">
        <h2 className="text-xl font-bold text-primary sm:text-2xl">
          {node.name}
        </h2>
        <ContentBlockRenderer blocks={node.contentBlocks} />
      </div>
    </div>
  );
}
