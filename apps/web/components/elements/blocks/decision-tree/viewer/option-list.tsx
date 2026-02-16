"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DecisionTreeNode } from "@/types/elements";

interface OptionListProps {
  nodes: DecisionTreeNode[];
  allNodes: DecisionTreeNode[];
  onSelect: (node: DecisionTreeNode) => void;
  selectedNodeId?: string | null;
  compact?: boolean;
}

export function OptionList({
  nodes,
  allNodes,
  onSelect,
  selectedNodeId,
  compact = false,
}: OptionListProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground text-sm">No options available</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", compact ? "p-3" : "p-0")}>
      {nodes.map((node) => {
        const hasChildren = allNodes.some((n) => n.parentId === node.id);
        const isSelected = selectedNodeId === node.id;

        return (
          <button
            key={node.id}
            type="button"
            className={cn(
              "group w-full flex items-center justify-between rounded-xl border px-5 py-4 text-left transition-all duration-200",
              "hover:shadow-md active:scale-[0.98]",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-lg"
                : "border-border hover:border-primary/30 hover:shadow-primary/5",
            )}
            onClick={() => onSelect(node)}
          >
            <span className="font-medium min-w-0 truncate">{node.name}</span>
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "size-5 shrink-0 transition-colors",
                  isSelected
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground group-hover:text-primary",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
