"use client";

import type { ElementRendererProps } from "@/modules/elements/framework/registry";
import type { FlowchartDiagram } from "@baseblocks/types/elements/blocks";
import { DiagramViewer } from "./diagram-viewer";

export function FlowchartRenderer({
  content,
}: ElementRendererProps<"flowchart">) {
  const diagrams = getDiagrams();

  function getDiagrams(): FlowchartDiagram[] {
    if (content.diagrams && content.diagrams.length > 0) {
      return content.diagrams;
    }
    if (!content.mermaidCode) return [];
    return [
      { id: "default", label: "Diagram", mermaidCode: content.mermaidCode },
    ];
  }

  if (diagrams.length === 0) return null;

  return (
    <DiagramViewer
      diagrams={diagrams}
      theme={content.theme}
      tabsMode={content.tabsMode}
    />
  );
}
