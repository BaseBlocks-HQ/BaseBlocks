"use client";

import { ViewerTabsBar } from "@/modules/editor/shared/element-tabs";

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
    <ViewerTabsBar
      activeId={activeTreeId}
      items={trees.map((tree) => ({ id: tree.id, label: tree.label }))}
      onActiveChange={onSelectTree}
      tabsMode={tabsMode}
    />
  );
}
