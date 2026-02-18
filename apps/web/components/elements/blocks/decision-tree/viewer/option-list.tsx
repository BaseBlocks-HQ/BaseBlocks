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
      <div className="flex flex-col items-center justify-center gap-2 py-12 px-4">
        <p className="text-sm font-medium text-muted-foreground">No options available</p>
        <p className="text-xs text-muted-foreground/70">
          There are no choices at this level
        </p>
      </div>
    );
  }

  return (
    <div className={cn(compact ? "p-2.5 space-y-1" : "space-y-2")}>
      {nodes.map((node) => {
        const hasChildren = allNodes.some((n) => n.parentId === node.id);
        const isSelected = selectedNodeId === node.id;

        return (
          <button
            key={node.id}
            type="button"
            className={cn(
              "group w-full flex items-center justify-between text-left transition-all duration-150",
              "active:scale-[0.98]",
              compact
                ? "rounded-lg border px-3.5 py-2.5 text-sm"
                : "rounded-xl border px-5 py-4",
              isSelected
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border hover:border-primary/30 hover:bg-accent/50",
            )}
            onClick={() => onSelect(node)}
          >
            <span className={cn("font-medium min-w-0 truncate", compact && "text-sm")}>
              {node.name}
            </span>
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "shrink-0 transition-colors",
                  compact ? "size-4 ml-2" : "size-5 ml-3",
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
