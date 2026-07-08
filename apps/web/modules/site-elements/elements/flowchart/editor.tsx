"use client";

import type { ElementEditorProps } from "@/modules/site-elements/manifest";
import { useAutoSave } from "@/modules/site-elements/shared/use-auto-save";
import type {
  FlowchartContent,
  FlowchartDiagram,
} from "@baseblocks/domain/elements/blocks";
import { useRef, useState } from "react";
import { DiagramEditor, generateDiagramId } from "./diagram-editor";

function normalizeDiagrams(content: FlowchartContent): FlowchartDiagram[] {
  if (content.diagrams && content.diagrams.length > 0) {
    return content.diagrams;
  }
  return [
    {
      id: generateDiagramId(),
      label: "Diagram 1",
      mermaidCode: content.mermaidCode || "",
    },
  ];
}

export function FlowchartEditor({
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"flowchart">) {
  const [diagrams, setDiagrams] = useState<FlowchartDiagram[]>(() =>
    normalizeDiagrams(content),
  );
  const [theme, setTheme] = useState<string | undefined>(content.theme);
  const [tabsMode, setTabsMode] = useState<"row" | "dropdown">(
    content.tabsMode ?? "row",
  );
  const themeRef = useRef(content.theme);
  const tabsModeRef = useRef<"row" | "dropdown">(content.tabsMode ?? "row");
  const diagramsRef = useRef(diagrams);
  const save = useAutoSave(onUpdate, onSaveStatusChange);

  const buildContent = (
    d: FlowchartDiagram[],
    t?: string,
    m: "row" | "dropdown" = "row",
  ): FlowchartContent => ({
    mermaidCode: d[0]?.mermaidCode ?? "",
    diagrams: d,
    theme: t,
    tabsMode: m,
  });

  const handleChange = (updated: FlowchartDiagram[]) => {
    setDiagrams(updated);
    diagramsRef.current = updated;
    onSaveStatusChange?.("pending");
    save(buildContent(updated, themeRef.current, tabsModeRef.current));
  };

  const handleThemeChange = (newTheme: string | undefined) => {
    setTheme(newTheme);
    themeRef.current = newTheme;
    onSaveStatusChange?.("pending");
    save(buildContent(diagramsRef.current, newTheme, tabsModeRef.current));
  };

  const handleTabsModeChange = (mode: "row" | "dropdown") => {
    setTabsMode(mode);
    tabsModeRef.current = mode;
    onSaveStatusChange?.("pending");
    save(buildContent(diagramsRef.current, themeRef.current, mode));
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-transparent shadow-xs">
      <DiagramEditor
        diagrams={diagrams}
        onChange={handleChange}
        contained
        onTabsModeChange={handleTabsModeChange}
        tabsMode={tabsMode}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </div>
  );
}
