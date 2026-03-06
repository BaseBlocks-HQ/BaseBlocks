"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";

interface DecisionTreeTab {
  id: string;
  label: string;
}

interface DecisionTreeSelectorProps {
  trees: DecisionTreeTab[];
  activeTreeId: string;
  tabsMode: "row" | "dropdown";
  onSelectTree: (treeId: string) => void;
}

export function DecisionTreeSelector({
  trees,
  activeTreeId,
  tabsMode,
  onSelectTree,
}: DecisionTreeSelectorProps) {
  if (trees.length <= 1) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-b",
        tabsMode === "dropdown" ? "px-3 py-2" : "px-3 py-2",
      )}
    >
      {tabsMode === "dropdown" ? (
        <Select value={activeTreeId} onValueChange={onSelectTree}>
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
              onClick={() => onSelectTree(tree.id)}
              className={cn(
                "max-w-[12rem] truncate rounded-md px-3 py-1 text-xs font-medium transition-colors shrink-0",
                tree.id === activeTreeId
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
  );
}
