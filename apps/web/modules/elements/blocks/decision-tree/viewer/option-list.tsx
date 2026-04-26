"use client";

import { cn } from "@/lib/utils";
import type { DecisionTreeNode } from "@baseblocks/types/elements";
import { ChevronRight } from "lucide-react";
import { MiddleTruncate } from "./middle-truncate";

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
      <div className="flex items-center justify-center px-4 py-12 text-center">
        <p className="max-w-[18rem] text-sm text-muted-foreground">
          No options are available at this step
        </p>
      </div>
    );
  }

  return (
    <div className={cn(compact ? "space-y-0.5 p-1" : "space-y-1 p-1.5")}>
      {nodes.map((node) => {
        const hasChildren = allNodes.some((n) => n.parentId === node.id);
        const isSelected = selectedNodeId === node.id;

        return (
          <button
            key={node.id}
            type="button"
            className={cn(
              "group flex w-full items-center justify-between text-left transition-colors duration-150 active:scale-[0.98]",
              compact
                ? "rounded-lg border px-2.5 py-2 text-sm"
                : "rounded-xl border px-3 py-2.5 text-sm sm:px-3.5 sm:py-3",
              isSelected
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border/70 bg-background/70 hover:border-border hover:bg-accent/40",
            )}
            onClick={() => onSelect(node)}
          >
            <MiddleTruncate
              text={node.name}
              className={cn(
                "flex-1 font-medium",
                compact ? "text-sm" : "text-sm sm:text-[15px]",
              )}
            />
            {hasChildren && (
              <ChevronRight
                className={cn(
                  "shrink-0 transition-colors",
                  compact ? "ml-2 size-3.5" : "ml-2.5 size-4",
                  isSelected
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
