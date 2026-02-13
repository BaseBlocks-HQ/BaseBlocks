"use client";

import type { ElementEditorProps } from "@/components/elements/registry";
import { useDebounceCallback } from "@/hooks";
import type { FlowchartContent, FlowchartDiagram } from "@/types/elements/blocks";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DiagramEditor, generateDiagramId } from "./diagram-editor";

function normalizeDiagrams(content: FlowchartContent): FlowchartDiagram[] {
  if (content.diagrams && content.diagrams.length > 0) {
    return content.diagrams;
  }
  return [{ id: generateDiagramId(), label: "Diagram 1", mermaidCode: content.mermaidCode || "" }];
}

export function FlowchartEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"flowchart">) {
  const [diagrams, setDiagrams] = useState<FlowchartDiagram[]>(() =>
    normalizeDiagrams(content),
  );

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (updatedDiagrams: FlowchartDiagram[]) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate({
            mermaidCode: updatedDiagrams[0]?.mermaidCode ?? "",
            diagrams: updatedDiagrams,
          });
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          toast.error("Failed to save changes");
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, onSaveStatusChange],
    ),
    500,
  );

  useEffect(() => {
    setDiagrams(normalizeDiagrams(content));
  }, [id]);

  const handleChange = (updated: FlowchartDiagram[]) => {
    setDiagrams(updated);
    onSaveStatusChange?.("pending");
    debouncedSave(updated);
  };

  return (
    <div className="rounded-lg border bg-card transition-all hover:ring-2 hover:ring-ring/20">
      <DiagramEditor diagrams={diagrams} onChange={handleChange} contained />
    </div>
  );
}
