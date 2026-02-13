"use client";

import type { FlowchartDiagram } from "@/types/elements/blocks";
import { useState } from "react";
import { MermaidDiagram } from "./mermaid-diagram";

interface DiagramViewerProps {
  diagrams: FlowchartDiagram[];
  contained?: boolean;
  theme?: string;
}

export function DiagramViewer({ diagrams, contained, theme }: DiagramViewerProps) {
  const [activeId, setActiveId] = useState<string>(diagrams[0]?.id ?? "");

  if (diagrams.length === 0) return null;

  const active = diagrams.find((d) => d.id === activeId) ?? diagrams[0]!;
  const showTabs = diagrams.length > 1;

  return (
    <div>
      {showTabs && (
        <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
          {diagrams.map((diagram) => (
            <button
              key={diagram.id}
              type="button"
              onClick={() => setActiveId(diagram.id)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                diagram.id === active.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {diagram.label}
            </button>
          ))}
        </div>
      )}
      <MermaidDiagram code={active.mermaidCode} contained={contained} theme={theme} />
    </div>
  );
}
