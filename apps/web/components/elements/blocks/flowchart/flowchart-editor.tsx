"use client";

import type { ElementEditorProps } from "@/components/elements/registry";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { useDebounceCallback } from "@/hooks";
import type {
  FlowchartContent,
  FlowchartDiagram,
} from "@repo/types/elements/blocks";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
  id,
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

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (
        updatedDiagrams: FlowchartDiagram[],
        updatedTheme?: string,
        updatedTabsMode: "row" | "dropdown" = "row",
      ) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate({
            mermaidCode: updatedDiagrams[0]?.mermaidCode ?? "",
            diagrams: updatedDiagrams,
            theme: updatedTheme,
            tabsMode: updatedTabsMode,
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
    setTheme(content.theme);
    setTabsMode(content.tabsMode ?? "row");
    themeRef.current = content.theme;
    tabsModeRef.current = content.tabsMode ?? "row";
  }, [id]);

  const handleChange = (updated: FlowchartDiagram[]) => {
    setDiagrams(updated);
    onSaveStatusChange?.("pending");
    debouncedSave(updated, themeRef.current, tabsModeRef.current);
  };

  const handleThemeChange = (newTheme: string | undefined) => {
    setTheme(newTheme);
    themeRef.current = newTheme;
    onSaveStatusChange?.("pending");
    debouncedSave(diagrams, newTheme, tabsModeRef.current);
  };

  const handleTabsModeChange = (mode: "row" | "dropdown") => {
    setTabsMode(mode);
    tabsModeRef.current = mode;
    onSaveStatusChange?.("pending");
    debouncedSave(diagrams, themeRef.current, mode);
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
