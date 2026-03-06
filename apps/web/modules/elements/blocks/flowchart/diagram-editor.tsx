"use client";

import type {
  FlowchartDiagram,
  TabsDisplayMode,
} from "@baseblocks/types/elements/blocks";
import { Button } from "@baseblocks/ui/button";
import { EditableTabs } from "@/modules/elements/components/editable-tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@baseblocks/ui/select";
import { THEMES } from "beautiful-mermaid";
import {
  ChevronDown,
  ChevronRight,
  Palette,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { MermaidDiagram } from "./mermaid-diagram";

const PLACEHOLDER = `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`;

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

const THEME_ENTRIES = Object.entries(THEMES);

/** Human-readable label for a theme key */
function themeLabel(key: string) {
  return key
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

interface DiagramEditorProps {
  diagrams: FlowchartDiagram[];
  onChange: (diagrams: FlowchartDiagram[]) => void;
  /** Allow removing all diagrams (shows empty state with "Add Diagram" button). Default false — keeps at least one. */
  allowEmpty?: boolean;
  contained?: boolean;
  tabsMode?: TabsDisplayMode;
  /** Current theme preset key */
  theme?: string;
  /** Called when user picks a theme */
  onThemeChange?: (theme: string | undefined) => void;
}

export function DiagramEditor({
  diagrams,
  onChange,
  allowEmpty = false,
  contained = true,
  tabsMode = "row",
  theme,
  onThemeChange,
}: DiagramEditorProps) {
  const [activeTabId, setActiveTabId] = useState<string>(diagrams[0]?.id ?? "");
  const [codeVisible, setCodeVisible] = useState(true);
  const resolvedActiveTabId = diagrams.some(
    (diagram) => diagram.id === activeTabId,
  )
    ? activeTabId
    : diagrams[0]?.id ?? "";
  const activeDiagram =
    diagrams.find((diagram) => diagram.id === resolvedActiveTabId) ??
    diagrams[0];

  const updateCode = (code: string) => {
    onChange(
      diagrams.map((d) =>
        d.id === resolvedActiveTabId ? { ...d, mermaidCode: code } : d,
      ),
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

  const currentDiagram = activeDiagram ?? diagrams[0]!;

  return (
    <div className="space-y-0">
      <EditableTabs
        activeId={currentDiagram.id}
        addLabel="Add diagram"
        items={diagrams.map((diagram) => ({
          id: diagram.id,
          label: diagram.label,
        }))}
        onActiveChange={setActiveTabId}
        onAdd={addDiagram}
        onRemove={
          allowEmpty || diagrams.length > 1 ? removeDiagram : undefined
        }
        onRename={(diagramId, label) => {
          onChange(
            diagrams.map((diagram) =>
              diagram.id === diagramId ? { ...diagram, label } : diagram,
            ),
          );
        }}
        removeLabel="Remove diagram"
        renameLabel="Rename diagram"
        tabsMode={tabsMode}
      />

      {/* Preview */}
      <div className="min-h-[80px] border-t min-w-0 overflow-hidden">
        {activeDiagram?.mermaidCode?.trim() ? (
          <MermaidDiagram
            code={activeDiagram.mermaidCode}
            contained={contained}
            theme={theme}
          />
        ) : (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
            Write mermaid code below to see a preview
          </div>
        )}
      </div>

      {/* Code editor + theme */}
      <div className="border-t">
        <div className="flex items-center justify-between">
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

          {onThemeChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 mr-3 text-xs rounded-md transition-colors ${
                    theme
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {theme && THEMES[theme] ? (
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full border border-black/10 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${THEMES[theme].bg} 50%, ${THEMES[theme].accent ?? THEMES[theme].fg} 50%)`,
                      }}
                    />
                  ) : (
                    <Palette className="h-3 w-3" />
                  )}
                  {theme ? themeLabel(theme) : "Theme"}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuRadioGroup
                  value={theme ?? ""}
                  onValueChange={(v) => onThemeChange(v || undefined)}
                >
                  <DropdownMenuRadioItem value="">
                    Auto (light/dark)
                  </DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  {THEME_ENTRIES.map(([key, colors]) => (
                    <DropdownMenuRadioItem
                      key={key}
                      value={key}
                      className="gap-2"
                    >
                      <span
                        className="inline-block h-3 w-3 rounded-full border border-black/10 shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${colors.bg} 50%, ${colors.accent ?? colors.fg} 50%)`,
                        }}
                      />
                      {themeLabel(key)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

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

export { generateId as generateDiagramId };
