"use client";

import type { FlowchartDiagram } from "@baseblocks/types/elements/blocks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
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
    <div className="space-y-2 w-full min-w-0 max-w-full">
      {showTabs &&
        (tabsMode === "dropdown" ? (
          <div className="px-1 min-w-0">
            <Select value={active.id} onValueChange={setActiveId}>
              <SelectTrigger className="h-9 w-full sm:w-[260px]">
                <SelectValue placeholder="Select diagram" />
              </SelectTrigger>
              <SelectContent>
                {diagrams.map((diagram) => (
                  <SelectItem key={diagram.id} value={diagram.id}>
                    {diagram.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex items-center gap-1 px-1 py-1 overflow-x-auto min-w-0">
            {diagrams.map((diagram) => (
              <button
                key={diagram.id}
                type="button"
                onClick={() => setActiveId(diagram.id)}
                className={`max-w-[12rem] truncate rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  diagram.id === active.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {diagram.label}
              </button>
            ))}
          </div>
        ))}
      <MermaidDiagram
        code={active.mermaidCode}
        contained={contained}
        theme={theme}
      />
    </div>
  );
}
