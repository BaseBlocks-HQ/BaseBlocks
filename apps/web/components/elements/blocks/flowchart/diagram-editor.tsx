"use client";

import type { FlowchartDiagram } from "@/types/elements/blocks";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Plus, X, Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MermaidDiagram } from "./mermaid-diagram";

const PLACEHOLDER = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

interface DiagramEditorProps {
  diagrams: FlowchartDiagram[];
  onChange: (diagrams: FlowchartDiagram[]) => void;
  /** Allow removing all diagrams (shows empty state with "Add Diagram" button). Default false — keeps at least one. */
  allowEmpty?: boolean;
  contained?: boolean;
}

export function DiagramEditor({
  diagrams,
  onChange,
  allowEmpty = false,
  contained = true,
}: DiagramEditorProps) {
  const [activeTabId, setActiveTabId] = useState<string>(diagrams[0]?.id ?? "");
  const [codeVisible, setCodeVisible] = useState(true);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Sync active tab when diagrams change externally
  useEffect(() => {
    if (diagrams.length > 0 && !diagrams.find((d) => d.id === activeTabId)) {
      setActiveTabId(diagrams[0]!.id);
    }
  }, [diagrams, activeTabId]);

  useEffect(() => {
    if (editingLabelId && labelInputRef.current) {
      labelInputRef.current.focus();
      labelInputRef.current.select();
    }
  }, [editingLabelId]);

  const activeDiagram = diagrams.find((d) => d.id === activeTabId) ?? diagrams[0];

  const updateCode = (code: string) => {
    onChange(
      diagrams.map((d) => (d.id === activeTabId ? { ...d, mermaidCode: code } : d)),
    );
  };

  const addDiagram = () => {
    const newDiagram: FlowchartDiagram = {
      id: generateId(),
      label: `Diagram ${diagrams.length + 1}`,
      mermaidCode: "",
    };
    setActiveTabId(newDiagram.id);
    onChange([...diagrams, newDiagram]);
  };

  const removeDiagram = (diagramId: string) => {
    if (!allowEmpty && diagrams.length <= 1) return;
    const idx = diagrams.findIndex((d) => d.id === diagramId);
    const updated = diagrams.filter((d) => d.id !== diagramId);
    if (activeTabId === diagramId) {
      setActiveTabId(updated[Math.min(idx, updated.length - 1)]?.id ?? "");
    }
    onChange(updated);
  };

  const startEditLabel = (diagramId: string) => {
    const diagram = diagrams.find((d) => d.id === diagramId);
    if (!diagram) return;
    setEditingLabelId(diagramId);
    setEditingLabelValue(diagram.label);
  };

  const commitEditLabel = () => {
    if (!editingLabelId) return;
    const label = editingLabelValue.trim() || "Untitled";
    onChange(
      diagrams.map((d) => (d.id === editingLabelId ? { ...d, label } : d)),
    );
    setEditingLabelId(null);
  };

  // Empty state
  if (diagrams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
        <p className="text-sm">No diagrams yet</p>
        <Button variant="outline" size="sm" onClick={addDiagram}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Diagram
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Tabs bar — always visible */}
      <div className="flex items-center gap-1 px-3 pt-2 pb-1 overflow-x-auto">
        {diagrams.map((diagram) => (
          <div
            key={diagram.id}
            className={`group/tab flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors ${
              diagram.id === activeTabId
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
            onClick={() => setActiveTabId(diagram.id)}
          >
            {editingLabelId === diagram.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commitEditLabel();
                }}
                className="flex items-center gap-1"
              >
                <input
                  ref={labelInputRef}
                  value={editingLabelValue}
                  onChange={(e) => setEditingLabelValue(e.target.value)}
                  onBlur={commitEditLabel}
                  className="bg-transparent border-none outline-none w-20 text-xs text-inherit"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="submit"
                  className="p-0.5 rounded hover:bg-white/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Check className="h-2.5 w-2.5" />
                </button>
              </form>
            ) : (
              <>
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    startEditLabel(diagram.id);
                  }}
                >
                  {diagram.label}
                </span>
                <button
                  type="button"
                  className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    startEditLabel(diagram.id);
                  }}
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                {(allowEmpty || diagrams.length > 1) && (
                  <button
                    type="button"
                    className="p-0.5 rounded opacity-0 group-hover/tab:opacity-100 transition-opacity hover:bg-white/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDiagram(diagram.id);
                    }}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addDiagram}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Add diagram"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Preview */}
      <div className="min-h-[80px]">
        {activeDiagram?.mermaidCode?.trim() ? (
          <MermaidDiagram code={activeDiagram.mermaidCode} contained={contained} />
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Write mermaid code below to see a preview
          </div>
        )}
      </div>

      {/* Code editor */}
      <div className="border-t">
        <button
          type="button"
          onClick={() => setCodeVisible(!codeVisible)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {codeVisible ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Mermaid Code
        </button>

        {codeVisible && (
          <div className="px-4 pb-4">
            <textarea
              value={activeDiagram?.mermaidCode ?? ""}
              onChange={(e) => updateCode(e.target.value)}
              className="w-full resize-y border rounded-md bg-muted/50 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ minHeight: "100px", maxHeight: "400px" }}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              rows={4}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export helper
export { generateId as generateDiagramId };
