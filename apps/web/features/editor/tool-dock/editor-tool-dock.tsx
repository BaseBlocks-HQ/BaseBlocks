"use client";

import { usePageExpandState } from "@/components/site-runtime/page-expand-state";
import {
  type AnyRegistryEntry,
  type ElementCategory,
  getElementsByCategory,
} from "@/components/site-elements/registry";
import { useEditorSite, useEditorUi } from "@/features/editor/editor-state";
import { CreatePageDialog } from "@/features/editor/pages/create-page-dialog";
import { PageTree } from "@/features/editor/pages/page-tree";
import { CollapsibleSettingsSection } from "@/features/editor/settings/settings-panel";
import { SiteConfigPanel } from "@/features/editor/settings/site-settings";
import type { Id } from "@baseblocks/backend";
import type { PageListItem, SectionPreset } from "@baseblocks/domain";
import type { ElementType } from "@baseblocks/domain/elements";
import { cn } from "@baseblocks/ui/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { Popover, PopoverAnchor, PopoverContent } from "@baseblocks/ui/popover";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import { Check, PanelLeftClose, PanelLeftOpen, PanelTop } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  IconFile,
  IconGear,
  IconRectLayoutGrid,
  IconSquareGrid2,
} from "nucleo-glass";

interface EditorToolDockProps {
  engine?: "openeditor" | "legacy";
  site: { _id: string; defaultPageId?: string };
  pages: PageListItem[];
  selectedPageId?: string;
  selectedColumnId?: string | null;
  onSelectPage: (pageId: string) => void;
  onAddSection?: (preset: SectionPreset) => void;
  onAddBlock?: (type: ElementType) => void;
  onEnableTabs?: () => void;
}

type EditorTool = "pages" | "site" | "sections" | "blocks";

const EXPANDED_PAGES_KEY = "baseblocks_editor_expanded_pages";
const TOOLS: Array<{ id: EditorTool; label: string; icon: ReactNode }> = [
  { id: "pages", label: "Pages", icon: <IconFile /> },
  { id: "sections", label: "Sections", icon: <IconRectLayoutGrid /> },
  { id: "blocks", label: "Blocks", icon: <IconSquareGrid2 /> },
  { id: "site", label: "Site", icon: <IconGear /> },
];
const BLOCK_GROUPS: Array<{ title: string; types: ElementType[] }> = [
  {
    title: "Writing",
    types: ["heading", "paragraph", "richtext", "callout", "code"],
  },
  { title: "Structure", types: ["divider", "spacer"] },
  { title: "Files", types: ["image", "file"] },
  {
    title: "Advanced",
    types: ["page", "directory", "flowchart", "decision-tree"],
  },
  { title: "Sections", types: ["search", "library", "quicklinks"] },
];
const sectionPresets = new Set(["single", "columns", "aside"]);

export function EditorToolDock({
  engine = "openeditor",
  site,
  pages,
  selectedPageId,
  selectedColumnId,
  onSelectPage,
  onAddSection,
  onAddBlock,
  onEnableTabs,
}: EditorToolDockProps) {
  const { canEdit } = useEditorSite();
  const { clearSelection } = useEditorUi();
  const isHorizontal = useIsMobile();
  const [expanded, setDockExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState<EditorTool>("pages");
  const [hoveredTool, setHoveredTool] = useState<EditorTool | null>(null);
  const [pinnedTool, setPinnedTool] = useState<EditorTool | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, setExpanded, toggleExpand } = usePageExpandState(
    EXPANDED_PAGES_KEY,
    site._id,
  );
  const navPages = pages.filter((page) => page.showInNavigation !== false);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((left, right) => left.order - right.order);

  const selectTool = (tool: EditorTool) => {
    setActiveTool(tool);
  };

  const clearCloseTimer = () => {
    if (!closeTimer.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  const previewTool = (tool: EditorTool) => {
    if (expanded || pinnedTool) return;
    clearCloseTimer();
    setHoveredTool(tool);
  };

  const schedulePreviewClose = () => {
    if (expanded || pinnedTool) return;
    clearCloseTimer();
    closeTimer.current = setTimeout(() => {
      setHoveredTool(null);
      closeTimer.current = null;
    }, 120);
  };

  const pinTool = (tool: EditorTool) => {
    clearCloseTimer();
    selectTool(tool);
    setHoveredTool(null);
    setPinnedTool((current) => (current === tool ? null : tool));
  };

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const selectPage = (pageId: string) => {
    clearSelection();
    onSelectPage(pageId);
  };

  const selectElement = (type: string) => {
    if (sectionPresets.has(type)) onAddSection?.(type as SectionPreset);
    else onAddBlock?.(type as ElementType);
  };

  const availableTools = TOOLS.filter(
    (tool) =>
      engine === "legacy" || (tool.id !== "sections" && tool.id !== "blocks"),
  );
  const openTool = pinnedTool ?? hoveredTool;

  const panel = (tool: EditorTool) => (
    <ToolPanel
      activeTool={tool}
      canEdit={canEdit}
      isExpanded={isExpanded}
      navPages={navPages}
      onEnableTabs={onEnableTabs}
      onSelectElement={selectElement}
      onSelectPage={selectPage}
      rootPages={rootPages}
      selectedPageId={selectedPageId}
      setExpanded={setExpanded}
      site={site}
      toggleExpand={toggleExpand}
    />
  );

  return (
    <aside
      className={cn(
        "pointer-events-auto fixed z-30",
        expanded
          ? "inset-x-3 bottom-3 md:inset-x-auto md:left-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
          : "bottom-3 left-1/2 -translate-x-1/2 md:bottom-auto md:left-4 md:top-1/2 md:translate-x-0 md:-translate-y-1/2",
      )}
      aria-label="Editor tools"
    >
      <Popover
        open={!expanded && openTool !== null}
        onOpenChange={(open) => {
          if (open) return;
          setPinnedTool(null);
          setHoveredTool(null);
        }}
      >
        <PopoverAnchor asChild>
          <div
            className={cn(
              "flex overflow-hidden rounded-2xl bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur-md",
              expanded && "max-h-[min(78vh,42rem)] flex-col md:flex-row",
            )}
          >
            <nav className="flex shrink-0 flex-row gap-0.5 p-1 md:flex-col">
              {availableTools.map((tool) => {
                const disabled =
                  (!canEdit && tool.id !== "pages") ||
                  (tool.id === "blocks" && !selectedColumnId);

                return (
                  <div key={tool.id}>
                    <Button
                      aria-label={tool.label}
                      aria-pressed={activeTool === tool.id}
                      className={cn(
                        "size-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-4",
                        (expanded
                          ? activeTool === tool.id
                          : openTool === tool.id) &&
                          "bg-primary/10 text-primary",
                      )}
                      disabled={disabled}
                      onClick={() =>
                        expanded ? selectTool(tool.id) : pinTool(tool.id)
                      }
                      onFocus={() => previewTool(tool.id)}
                      onMouseEnter={() => previewTool(tool.id)}
                      onMouseLeave={schedulePreviewClose}
                      size="icon"
                      variant="ghost"
                    >
                      {tool.icon}
                    </Button>
                  </div>
                );
              })}

              <Button
                aria-label={
                  expanded ? "Collapse tool dock" : "Expand tool dock"
                }
                className="size-8 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-4"
                onClick={() => {
                  clearCloseTimer();
                  setPinnedTool(null);
                  setHoveredTool(null);
                  setDockExpanded((current) => !current);
                }}
                size="icon"
                variant="ghost"
              >
                {expanded ? <PanelLeftClose /> : <PanelLeftOpen />}
              </Button>
            </nav>

            {expanded ? (
              <div className="min-h-0 w-full overflow-y-auto md:w-80">
                {panel(activeTool)}
              </div>
            ) : null}
          </div>
        </PopoverAnchor>

        {!expanded && openTool ? (
          <PopoverContent
            align={isHorizontal ? "center" : "start"}
            className="max-h-[min(70vh,40rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.5rem] border-0 bg-sidebar/95 p-0 text-sidebar-foreground shadow-2xl backdrop-blur-md md:max-h-[min(calc(50vh+2rem),40rem)]"
            onMouseEnter={clearCloseTimer}
            onMouseLeave={schedulePreviewClose}
            side={isHorizontal ? "top" : "right"}
            sideOffset={12}
          >
            {panel(openTool)}
          </PopoverContent>
        ) : null}
      </Popover>
    </aside>
  );
}

function ToolPanel({
  activeTool,
  canEdit,
  navPages,
  onEnableTabs,
  onSelectElement,
  onSelectPage,
  rootPages,
  selectedPageId,
  setExpanded,
  site,
  toggleExpand,
  isExpanded,
}: {
  activeTool: EditorTool;
  canEdit: boolean;
  navPages: PageListItem[];
  onEnableTabs?: () => void;
  onSelectElement: (type: string) => void;
  onSelectPage: (pageId: string) => void;
  rootPages: PageListItem[];
  selectedPageId?: string;
  setExpanded: (pageId: string, expanded: boolean) => void;
  site: { _id: string; defaultPageId?: string };
  toggleExpand: (pageId: string) => void;
  isExpanded: (pageId: string) => boolean;
}) {
  if (activeTool === "pages") {
    return (
      <>
        <div className="flex h-14 items-center justify-between px-3">
          <p className="text-sm font-semibold">Pages</p>
          {canEdit ? <CreatePageDialog siteId={site._id} /> : null}
        </div>
        <div className="px-2 pb-2">
          {rootPages.length ? (
            <SidebarMenu>
              <PageTree
                allPages={navPages}
                defaultPageId={site.defaultPageId}
                isExpanded={isExpanded}
                onSelect={onSelectPage}
                onSetExpanded={setExpanded}
                onToggleExpand={toggleExpand}
                selectedPageId={selectedPageId}
                siteId={site._id}
              />
            </SidebarMenu>
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No pages yet.
            </p>
          )}
        </div>
      </>
    );
  }

  if (activeTool === "site") {
    return <SiteConfigPanel siteId={site._id as Id<"sites">} />;
  }

  if (!canEdit) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        You have view-only access.
      </p>
    );
  }

  const entries = getElementsByCategory(activeTool as ElementCategory);
  if (activeTool === "blocks") {
    const byType = new Map(entries.map((entry) => [entry.type, entry]));
    return BLOCK_GROUPS.map((group) => {
      const groupEntries = group.types
        .map((type) => byType.get(type))
        .filter((entry): entry is AnyRegistryEntry => Boolean(entry));
      return groupEntries.length ? (
        <ElementGrid
          key={group.title}
          entries={groupEntries}
          onSelect={onSelectElement}
          title={group.title}
        />
      ) : null;
    });
  }

  return (
    <>
      <ElementGrid
        entries={entries}
        onSelect={onSelectElement}
        title="Sections"
      />
      {onEnableTabs ? (
        <div className="px-4 pb-4">
          <PickerCard icon={PanelTop} label="Tabs" onClick={onEnableTabs} />
        </div>
      ) : null}
    </>
  );
}

function ElementGrid({
  entries,
  onSelect,
  title,
}: {
  entries: AnyRegistryEntry[];
  onSelect: (type: string) => void;
  title: string;
}) {
  return (
    <div className="p-4">
      <CollapsibleSettingsSection title={title} contentVariant="stack">
        {entries.map((entry) => (
          <PickerCard
            key={entry.type}
            icon={entry.icon}
            label={entry.label}
            preview={entry.preview}
            onClick={() => onSelect(entry.type)}
          />
        ))}
      </CollapsibleSettingsSection>
    </div>
  );
}

function PickerCard({
  icon: Icon,
  isSelected,
  label,
  onClick,
  preview: Preview,
}: {
  icon: LucideIcon;
  isSelected?: boolean;
  label: string;
  onClick: () => void;
  preview?: ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isSelected}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        !isSelected && "hover:border-border hover:shadow-md",
      )}
      onClick={onClick}
    >
      <div className="relative aspect-[7/4] min-h-[120px] w-full overflow-hidden rounded-lg bg-muted/35 ring-1 ring-border/25 dark:bg-muted/25">
        <div className="absolute inset-0">
          {Preview ? (
            <Preview className="h-full w-full" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Icon className="h-8 w-8 text-muted-foreground/80" />
            </div>
          )}
        </div>
        {isSelected ? (
          <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end bg-gradient-to-t from-background/95 via-background/55 to-transparent px-2 pb-1.5 pt-7">
          <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-tight text-foreground/95">
            {label}
          </span>
        </div>
      </div>
    </button>
  );
}
