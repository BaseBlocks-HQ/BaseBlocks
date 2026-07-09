"use client";

import { usePageExpandState } from "@/lib/use-page-expand-state";
import { PageTree } from "@/modules/editor/pages/page-tree";
import { CreatePageDialog } from "@/modules/editor/pages/create-page-dialog";
import { CustomizationConfigPanel } from "@/modules/editor/settings/customization-settings";
import { NavigationConfigPanel } from "@/modules/editor/settings/navigation-settings";
import { CollapsibleSettingsSection } from "@/modules/editor/settings/settings-panel";
import { SiteConfigPanel } from "@/modules/editor/settings/site-settings";
import { useEditorSite, useEditorUi } from "@/modules/editor/editor-state";
import {
  type AnyRegistryEntry,
  type ElementCategory,
  getElementsByCategory,
} from "@/modules/site-elements/registry";
import type { Id } from "@baseblocks/backend";
import type { LayoutType, PageListItem } from "@baseblocks/domain";
import type { ElementType } from "@baseblocks/domain/elements";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { Check, PanelTop } from "lucide-react";
import type { ComponentType } from "react";
import {
  IconColorPalette,
  IconFile,
  IconGear,
  IconRectLayoutGrid,
  IconSitemap,
  IconSquareGrid2,
} from "nucleo-glass";
import { type ReactNode, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface EditorFloatingRailProps {
  site: {
    _id: string;
    defaultPageId?: string;
  };
  pages: PageListItem[];
  selectedPageId?: string;
  selectedSlotId?: string | null;
  onSelectPage: (pageId: string) => void;
  onAddLayout?: (type: LayoutType) => void;
  onAddBlock?: (type: ElementType) => void;
  onEnableTabs?: () => void;
}

type RailPanelId = "pages" | ElementCategory;

const EXPANDED_PAGES_KEY = "baseblocks_editor_expanded_pages";

const RAIL_ITEMS: Array<{
  id: RailPanelId;
  label: string;
  icon: ReactNode;
}> = [
  { id: "pages", label: "Pages", icon: <IconFile className="h-5 w-5" /> },
  {
    id: "layouts",
    label: "Layouts",
    icon: <IconRectLayoutGrid className="h-5 w-5" />,
  },
  {
    id: "blocks",
    label: "Blocks",
    icon: <IconSquareGrid2 className="h-5 w-5" />,
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: <IconSitemap className="h-5 w-5" />,
  },
  {
    id: "customization",
    label: "Customization",
    icon: <IconColorPalette className="h-5 w-5" />,
  },
  { id: "site", label: "Site", icon: <IconGear className="h-5 w-5" /> },
];

const CATEGORY_TITLES: Record<ElementCategory, string> = {
  site: "Site Settings",
  customization: "Customization",
  navigation: "Navigation",
  layouts: "Layouts",
  blocks: "Blocks",
};

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

const layoutTypes = new Set([
  "single",
  "rows",
  "columns",
  "grid",
  "spacer",
  "vertical",
]);

function RailButton({
  active,
  disabled,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
        active
          ? "border-border bg-accent text-foreground"
          : "border-transparent text-muted-foreground hover:bg-accent/70 hover:text-foreground",
        disabled && "cursor-not-allowed opacity-45 hover:bg-transparent",
      )}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function PanelSurface({ children }: { children: ReactNode }) {
  return (
    <div className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-2xl backdrop-blur-md">
      {children}
    </div>
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

function RailPanel({
  activePanel,
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
  activePanel: RailPanelId;
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
  if (activePanel === "pages") {
    return (
      <PanelSurface>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Pages</p>
          {canEdit ? <CreatePageDialog siteId={site._id} /> : null}
        </div>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <div className="p-2">
            {rootPages.length > 0 ? (
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
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No pages yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </PanelSurface>
    );
  }

  if (activePanel === "site") {
    return (
      <PanelSurface>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <SiteConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </PanelSurface>
    );
  }

  if (activePanel === "navigation") {
    return (
      <PanelSurface>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <NavigationConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </PanelSurface>
    );
  }

  if (activePanel === "customization") {
    return (
      <PanelSurface>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <CustomizationConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </PanelSurface>
    );
  }

  if (!canEdit) {
    return (
      <PanelSurface>
        <div className="px-4 py-4 text-sm text-muted-foreground">
          You have view-only access.
        </div>
      </PanelSurface>
    );
  }

  const entries = getElementsByCategory(activePanel);

  return (
    <PanelSurface>
      <ScrollArea className="h-[min(60vh,32rem)]">
        {activePanel === "blocks" ? (
          BLOCK_GROUPS.map((group) => {
            const byType = new Map(entries.map((entry) => [entry.type, entry]));
            const groupEntries = group.types
              .map((type) => byType.get(type))
              .filter((entry): entry is AnyRegistryEntry => Boolean(entry));
            return groupEntries.length > 0 ? (
              <ElementGrid
                key={group.title}
                entries={groupEntries}
                onSelect={onSelectElement}
                title={group.title}
              />
            ) : null;
          })
        ) : (
          <>
            <ElementGrid
              entries={entries}
              onSelect={onSelectElement}
              title={CATEGORY_TITLES[activePanel] ?? "Elements"}
            />
            {activePanel === "layouts" && onEnableTabs ? (
              <div className="px-4 pb-4">
                <PickerCard
                  icon={PanelTop}
                  label="Tabs"
                  onClick={onEnableTabs}
                />
              </div>
            ) : null}
          </>
        )}
      </ScrollArea>
    </PanelSurface>
  );
}

export function EditorFloatingRail({
  site,
  pages,
  selectedPageId,
  selectedSlotId,
  onSelectPage,
  onAddLayout,
  onAddBlock,
  onEnableTabs,
}: EditorFloatingRailProps) {
  const { canEdit } = useEditorSite();
  const { clearSelection } = useEditorUi();
  const [activePanel, setActivePanel] = useState<RailPanelId | null>(null);
  const { isExpanded, setExpanded, toggleExpand } = usePageExpandState(
    EXPANDED_PAGES_KEY,
    site._id,
  );

  const navPages = pages.filter((page) => page.showInNavigation !== false);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((left, right) => left.order - right.order);

  const selectPanel = (panelId: RailPanelId) => {
    setActivePanel((current) => (current === panelId ? null : panelId));
  };

  const selectPage = (pageId: string) => {
    clearSelection();
    onSelectPage(pageId);
    setActivePanel(null);
  };

  const selectElement = (type: string) => {
    if (layoutTypes.has(type)) {
      onAddLayout?.(type as LayoutType);
      return;
    }
    onAddBlock?.(type as ElementType);
  };

  return (
    <div className="pointer-events-auto relative">
      <div className="rounded-2xl border border-sidebar-border bg-sidebar/95 p-2 text-sidebar-foreground backdrop-blur-md">
        <div className="flex flex-row gap-1 md:flex-col">
          {RAIL_ITEMS.map((item) => {
            const requiresSlot = item.id === "blocks";
            const disabled =
              (!canEdit && item.id !== "pages") ||
              (requiresSlot && !selectedSlotId);
            return (
              <RailButton
                key={item.id}
                active={activePanel === item.id}
                disabled={disabled}
                icon={item.icon}
                label={item.label}
                onClick={() => selectPanel(item.id)}
              />
            );
          })}
        </div>
      </div>

      {activePanel ? (
        <div className="absolute bottom-full left-0 mb-3 md:bottom-auto md:left-full md:top-0 md:mb-0 md:ml-3">
          <RailPanel
            activePanel={activePanel}
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
        </div>
      ) : null}
    </div>
  );
}
