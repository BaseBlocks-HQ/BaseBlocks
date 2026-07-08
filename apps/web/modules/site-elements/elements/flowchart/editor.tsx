"use client";

import type { ElementEditorProps } from "@/modules/site-elements/registry";
import { useAutoSave } from "@/modules/editor/shared/use-auto-save";
import { ViewerTabsBar } from "@/modules/editor/shared/element-tabs";
import type {
  FlowchartContent,
  FlowchartDiagram,
} from "@baseblocks/domain/elements";
import { useRef, useState } from "react";
import { DiagramEditor, generateDiagramId } from "./diagram-editor";
import { MermaidDiagram } from "./mermaid-diagram";
import type { ElementRendererProps } from "@/modules/site-elements/registry";

function normalizeDiagrams(content: FlowchartContent): FlowchartDiagram[] {
  if (content.diagrams.length > 0) {
    return content.diagrams;
  }
  return [
    {
      id: generateDiagramId(),
      label: "Diagram 1",
      mermaidCode: "",
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

function DiagramViewer({
  diagrams,
  contained,
  theme,
  tabsMode = "row",
}: {
  diagrams: FlowchartDiagram[];
  contained?: boolean;
  theme?: string;
  tabsMode?: "row" | "dropdown";
}) {
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

export function FlowchartRenderer({
  content,
}: ElementRendererProps<"flowchart">) {
  const diagrams: FlowchartDiagram[] = content.diagrams;

  if (diagrams.length === 0) return null;

  return (
    <DiagramViewer
      diagrams={diagrams}
      theme={content.theme}
      tabsMode={content.tabsMode}
    />
  );
}
