"use client";

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useAutoSave } from "@/modules/elements/hooks/use-auto-save";
import type {
  FlowchartContent,
  FlowchartDiagram,
} from "@baseblocks/types/elements/blocks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { useEffect, useRef, useState } from "react";
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

  useEffect(() => {
    setDiagrams(normalizeDiagrams(content));
    setTheme(content.theme);
    setTabsMode(content.tabsMode ?? "row");
    themeRef.current = content.theme;
    tabsModeRef.current = content.tabsMode ?? "row";
  }, [content]);

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
    <div className="rounded-lg border bg-card transition-all hover:ring-2 hover:ring-ring/20">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">
          Diagram Tabs
        </p>
        <Select
          value={tabsMode}
          onValueChange={(value) =>
            handleTabsModeChange(value as "row" | "dropdown")
          }
        >
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="row">Horizontal Row</SelectItem>
            <SelectItem value="dropdown">Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <DiagramEditor
        diagrams={diagrams}
        onChange={handleChange}
        contained
        tabsMode={tabsMode}
        theme={theme}
        onThemeChange={handleThemeChange}
      />
    </div>
  );
}
