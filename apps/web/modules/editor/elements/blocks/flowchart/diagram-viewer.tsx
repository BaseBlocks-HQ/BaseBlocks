"use client";

import { ViewerTabsBar } from "@/modules/editor/elements/components/viewer-tabs-bar";
import type { FlowchartDiagram } from "@baseblocks/types/elements/blocks";
import { useState } from "react";
import { MermaidDiagram } from "./mermaid-diagram";

interface DiagramViewerProps {
  diagrams: FlowchartDiagram[];
  contained?: boolean;
  theme?: string;
  tabsMode?: "row" | "dropdown";
}

export function DiagramViewer({
  diagrams,
  contained,
  theme,
  tabsMode = "row",
}: DiagramViewerProps) {
  const [activeId, setActiveId] = useState<string>(diagrams[0]?.id ?? "");

  if (diagrams.length === 0) return null;

  const active = diagrams.find((d) => d.id === activeId) ?? diagrams[0]!;
  const showTabs = diagrams.length > 1;

  return (
    <div className="w-full min-w-0 max-w-full space-y-0 overflow-hidden rounded-lg border border-border/70 bg-transparent shadow-xs">
      {showTabs && (
        <ViewerTabsBar
          activeId={active.id}
          items={diagrams.map((d) => ({ id: d.id, label: d.label }))}
          onActiveChange={setActiveId}
          tabsMode={tabsMode}
        />
      )}
      <div className="p-1">
        <MermaidDiagram
          code={active.mermaidCode}
          contained={contained}
          theme={theme}
        />
      </div>
    </div>
  );
}
