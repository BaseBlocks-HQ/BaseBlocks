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
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@baseblocks/ui/sidebar";
import { Check, PanelTop } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  IconFile,
  IconGear,
  IconRectLayoutGrid,
  IconSquareGrid2,
} from "nucleo-glass";

interface EditorSidebarProps {
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

export function EditorSidebar(props: EditorSidebarProps) {
  return (
    <Sidebar
      variant="floating"
      collapsible="icon"
      className="z-30 [&_[data-slot=sidebar-inner]]:border-0 [&_[data-slot=sidebar-inner]]:shadow-none"
    >
      <EditorSidebarContents {...props} />
    </Sidebar>
  );
}

function EditorSidebarContents({
  engine = "openeditor",
  site,
  pages,
  selectedPageId,
  selectedColumnId,
  onSelectPage,
  onAddSection,
  onAddBlock,
  onEnableTabs,
}: EditorSidebarProps) {
  const { canEdit } = useEditorSite();
  const { clearSelection } = useEditorUi();
  const { state, setOpen, setOpenMobile, isMobile } = useSidebar();
  const [activeTool, setActiveTool] = useState<EditorTool>("pages");
  const { isExpanded, setExpanded, toggleExpand } = usePageExpandState(
    EXPANDED_PAGES_KEY,
    site._id,
  );
  const navPages = pages.filter((page) => page.showInNavigation !== false);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((left, right) => left.order - right.order);

  const selectTool = (tool: EditorTool) => {
    if (activeTool === tool && state === "expanded" && !isMobile) {
      setOpen(false);
      return;
    }
    setActiveTool(tool);
    if (isMobile) setOpenMobile(true);
    else setOpen(true);
  };

  const selectPage = (pageId: string) => {
    clearSelection();
    onSelectPage(pageId);
    if (isMobile) setOpenMobile(false);
  };

  const selectElement = (type: string) => {
    if (sectionPresets.has(type)) onAddSection?.(type as SectionPreset);
    else onAddBlock?.(type as ElementType);
  };

  return (
    <div className="flex h-full min-h-0">
      <nav className="w-12 shrink-0 p-2">
        <SidebarMenu className="gap-0.5">
          {TOOLS.filter(
            (tool) =>
              engine === "legacy" ||
              (tool.id !== "sections" && tool.id !== "blocks"),
          ).map((tool) => {
            const disabled =
              (!canEdit && tool.id !== "pages") ||
              (tool.id === "blocks" && !selectedColumnId);
            return (
              <SidebarMenuItem key={tool.id}>
                <SidebarMenuButton
                  aria-label={tool.label}
                  className="size-8 justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-primary"
                  disabled={disabled}
                  isActive={activeTool === tool.id}
                  onClick={() => selectTool(tool.id)}
                  tooltip={tool.label}
                >
                  {tool.icon}
                  <span className="sr-only">{tool.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </nav>

      <SidebarContent className="group-data-[collapsible=icon]:hidden">
        <ToolPanel
          activeTool={activeTool}
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
      </SidebarContent>
    </div>
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
