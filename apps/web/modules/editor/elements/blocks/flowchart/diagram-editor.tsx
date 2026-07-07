"use client";

import { EditableTabs } from "@/modules/editor/elements/components/editable-tabs";
import { TabsModeToggle } from "@/modules/editor/elements/components/tabs-mode-toggle";
import type {
  FlowchartDiagram,
  TabsDisplayMode,
} from "@baseblocks/types/elements/blocks";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@baseblocks/ui/resizable";
import { THEMES } from "beautiful-mermaid";
import { ChevronDown, Palette, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
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
  /** Layout of diagram tabs (row vs dropdown); control shown in tab bar when set */
  onTabsModeChange?: (mode: "row" | "dropdown") => void;
}

export function DiagramEditor({
  diagrams,
  onChange,
  allowEmpty = false,
  contained = true,
  tabsMode = "row",
  theme,
  onThemeChange,
  onTabsModeChange,
}: DiagramEditorProps) {
  const t = useTranslations("elements.flowchart");
  const isMobile = useIsMobile();
  const [activeTabId, setActiveTabId] = useState<string>(diagrams[0]?.id ?? "");
  const resolvedActiveTabId = diagrams.some(
    (diagram) => diagram.id === activeTabId,
  )
    ? activeTabId
    : (diagrams[0]?.id ?? "");
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
      label: t("diagramNumber", { number: diagrams.length + 1 }),
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
        <p className="text-sm">{t("noDiagrams")}</p>
        <Button variant="outline" size="sm" onClick={addDiagram}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {t("addDiagram")}
        </Button>
      </div>
    );
  }

  const currentDiagram = activeDiagram ?? diagrams[0]!;

  const themeMenu = onThemeChange ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 shrink-0 gap-1 px-2 text-[11px] ${
            theme
              ? "text-primary hover:text-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {theme && THEMES[theme] ? (
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-black/10"
              style={{
                background: `linear-gradient(135deg, ${THEMES[theme].bg} 50%, ${THEMES[theme].accent ?? THEMES[theme].fg} 50%)`,
              }}
            />
          ) : (
            <Palette className="h-3 w-3 shrink-0" />
          )}
          <span className="max-w-[7rem] truncate sm:max-w-[10rem]">
            {theme ? themeLabel(theme) : t("theme")}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuRadioGroup
          value={theme ?? ""}
          onValueChange={(v) => onThemeChange(v || undefined)}
        >
          <DropdownMenuRadioItem value="">
            {t("themeAuto")}
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {THEME_ENTRIES.map(([key, colors]) => (
            <DropdownMenuRadioItem key={key} value={key} className="gap-2">
              <span
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-black/10"
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
  ) : null;

  const tabsModeToggle =
    !isMobile && onTabsModeChange ? (
      <TabsModeToggle
        mode={tabsMode}
        horizontalLabel={t("tabsHorizontal")}
        dropdownLabel={t("tabsDropdown")}
        onChange={onTabsModeChange}
      />
    ) : null;

  const headerEnd =
    themeMenu || tabsModeToggle ? (
      <div className="flex shrink-0 items-center gap-1">
        {themeMenu}
        {tabsModeToggle}
      </div>
    ) : undefined;

  const codePanel = (
    <div className="flex h-full min-h-[13rem] flex-col overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs">
      <textarea
        value={activeDiagram?.mermaidCode ?? ""}
        onChange={(e) => updateCode(e.target.value)}
        className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2.5 py-2.5 font-mono text-sm leading-6 outline-none placeholder:text-muted-foreground/50 focus-visible:ring-0"
        placeholder={PLACEHOLDER}
        spellCheck={false}
      />
    </div>
  );

  const previewPanel = (
    <div className="flex h-full min-h-[13rem] min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border/60 bg-background/85 shadow-xs">
      <MermaidDiagram
        code={activeDiagram?.mermaidCode ?? ""}
        embedded
        fillHeight
        contained={contained}
        theme={theme}
      />
    </div>
  );

  return (
    <div className="flex min-h-0 flex-col space-y-0">
      <EditableTabs
        activeId={currentDiagram.id}
        addLabel={t("addDiagramTab")}
        endContent={headerEnd}
        items={diagrams.map((diagram) => ({
          id: diagram.id,
          label: diagram.label,
        }))}
        onActiveChange={setActiveTabId}
        onAdd={addDiagram}
        onRemove={allowEmpty || diagrams.length > 1 ? removeDiagram : undefined}
        onRename={(diagramId, label) => {
          onChange(
            diagrams.map((diagram) =>
              diagram.id === diagramId ? { ...diagram, label } : diagram,
            ),
          );
        }}
        removeLabel={t("removeDiagramTab")}
        renameLabel={t("renameDiagramTab")}
        tabsMode={tabsMode}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5 border-t-0 bg-transparent px-1 pb-1 pt-0.5 md:min-h-[min(24rem,50vh)]">
        {isMobile ? (
          <>
            {previewPanel}
            {codePanel}
          </>
        ) : (
          <ResizablePanelGroup
            orientation="horizontal"
            className="min-h-0 min-w-0 flex-1"
          >
            <ResizablePanel defaultSize={34} minSize={22}>
              <div className="h-full min-w-0">{codePanel}</div>
            </ResizablePanel>
            <ResizableHandle className="w-1 cursor-col-resize bg-transparent after:hidden focus-visible:ring-0" />
            <ResizablePanel defaultSize={66} minSize={38}>
              <div className="h-full min-w-0">{previewPanel}</div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </div>
  );
}

export { generateId as generateDiagramId };
