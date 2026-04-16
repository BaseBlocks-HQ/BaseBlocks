"use client";

import {
  type AnyRegistryEntry,
  getElementsByCategory,
} from "@/modules/elements/framework/registry";
import { themedPickerImagePreview } from "@/modules/elements/framework/themed-picker-image";
import { CustomizationConfigPanel } from "@/modules/elements/panels/customization";
import { NavigationConfigPanel } from "@/modules/elements/panels/navigation";
import { SiteConfigPanel } from "@/modules/elements/panels/site";
import { SortablePageTree } from "@/modules/navigation";
import { usePageExpandState } from "@/modules/navigation/hooks/use-page-expand-state";
import {
  useEditorSite,
  useEditorUi,
  useEditorUndo,
} from "@/modules/shared/contexts/editor-context";
import type { Id } from "@baseblocks/backend";
import type {
  LayoutBlockType,
  LayoutType,
  PageListItem,
} from "@baseblocks/types";
import type { ElementCategory, ElementType } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Separator } from "@baseblocks/ui/separator";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { PanelTop, Redo2, Undo2 } from "lucide-react";
import {
  IconColorPalette,
  IconFile,
  IconGear,
  IconRectLayoutGrid,
  IconSitemap,
  IconSquareGrid2,
} from "nucleo-glass";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { EditorFlyoutSurface } from "./components/editor-flyout-surface";
import { ElementCard } from "./components/element-picker/element-card";
import { ElementGrid } from "./components/element-picker/element-grid";
import { CreatePageDialog } from "./create-page-dialog";

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
  onAddBlock?: (type: LayoutBlockType) => void;
  onEnableTabs?: () => void;
}

type RailPanelId = "pages" | ElementCategory;

const CATEGORY_TITLES: Record<ElementCategory, string> = {
  site: "Site Settings",
  customization: "Customization",
  navigation: "Navigation",
  layouts: "Layouts",
  blocks: "Blocks",
};

const CATEGORY_ICONS: Record<ElementCategory, ReactNode> = {
  site: <IconGear className="h-5 w-5" />,
  customization: <IconColorPalette className="h-5 w-5" />,
  navigation: <IconSitemap className="h-5 w-5" />,
  layouts: <IconRectLayoutGrid className="h-5 w-5" />,
  blocks: <IconSquareGrid2 className="h-5 w-5" />,
};

const RAIL_ITEMS: Array<{
  id: RailPanelId;
  label: string;
  icon: ReactNode;
}> = [
  {
    id: "pages",
    label: "Pages",
    icon: <IconFile className="h-5 w-5" />,
  },
  {
    id: "layouts",
    label: CATEGORY_TITLES.layouts,
    icon: CATEGORY_ICONS.layouts,
  },
  {
    id: "blocks",
    label: CATEGORY_TITLES.blocks,
    icon: CATEGORY_ICONS.blocks,
  },
  {
    id: "navigation",
    label: CATEGORY_TITLES.navigation,
    icon: CATEGORY_ICONS.navigation,
  },
  {
    id: "customization",
    label: CATEGORY_TITLES.customization,
    icon: CATEGORY_ICONS.customization,
  },
  {
    id: "site",
    label: CATEGORY_TITLES.site,
    icon: CATEGORY_ICONS.site,
  },
];

const SLOT_REQUIRED_CATEGORIES: ElementCategory[] = ["blocks"];

const BLOCK_GROUPS: Array<{ title: string; types: ElementType[] }> = [
  {
    title: "Writing",
    types: ["heading", "paragraph", "richtext", "callout", "code"],
  },
  { title: "Structure", types: ["divider", "block-spacer"] },
  {
    title: "Advanced",
    types: ["subpage", "directory", "flowchart", "decision-tree"],
  },
  {
    title: "Sections",
    types: ["search", "library", "quicklinks"],
  },
];

const TabsPreview = themedPickerImagePreview(
  "/editor/picker/layouts/tabs-light.png",
  "/editor/picker/layouts/tabs-dark.png",
);

const CONFIG_PANEL_CATEGORIES: ElementCategory[] = [
  "site",
  "customization",
  "navigation",
];

function FloatingRailButton({
  active,
  disabled,
  icon,
  label,
  onClick,
  onFocus,
  onMouseEnter,
  registerRef,
  tooltip,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  onFocus: () => void;
  onMouseEnter: () => void;
  registerRef: (node: HTMLButtonElement | null) => void;
  tooltip?: string;
}) {
  const button = (
    <button
      ref={registerRef}
      type="button"
      aria-disabled={disabled}
      aria-label={label}
      title={tooltip ? undefined : label}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-[1.15rem] border transition-colors sm:h-10 sm:w-10 sm:rounded-[1.35rem]",
        active
          ? "border-border bg-accent/70 text-foreground shadow-sm"
          : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/55 hover:text-foreground",
        disabled &&
          "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted-foreground",
      )}
      onClick={disabled ? undefined : onClick}
      onFocus={disabled ? undefined : onFocus}
      onMouseEnter={disabled ? undefined : onMouseEnter}
    >
      {icon}
    </button>
  );

  if (!tooltip) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex">{button}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function RailUndoRedoControls() {
  const { currentPageId } = useEditorUi();
  const { undo, redo, canUndo, canRedo, isUndoRedoExecuting } = useEditorUndo();

  return (
    <div className="flex flex-col gap-1 pt-2">
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-9 w-9 rounded-[1.15rem] text-muted-foreground hover:bg-accent/55 hover:text-foreground sm:h-10 sm:w-10 sm:rounded-[1.35rem]"
        title="Undo"
        disabled={
          isUndoRedoExecuting ||
          (!canUndo(currentPageId ?? undefined) && !canUndo())
        }
        onClick={() => {
          if (currentPageId && canUndo(currentPageId)) {
            undo(currentPageId);
            return;
          }
          undo();
        }}
      >
        <Undo2 className="h-4 w-4" />
        <span className="sr-only">Undo</span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-9 w-9 rounded-[1.15rem] text-muted-foreground hover:bg-accent/55 hover:text-foreground sm:h-10 sm:w-10 sm:rounded-[1.35rem]"
        title="Redo"
        disabled={
          isUndoRedoExecuting ||
          (!canRedo(currentPageId ?? undefined) && !canRedo())
        }
        onClick={() => {
          if (currentPageId && canRedo(currentPageId)) {
            redo(currentPageId);
            return;
          }
          redo();
        }}
      >
        <Redo2 className="h-4 w-4" />
        <span className="sr-only">Redo</span>
      </Button>
    </div>
  );
}

function FloatingRailFlyout({
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
  site: {
    _id: string;
    defaultPageId?: string;
  };
  toggleExpand: (pageId: string) => void;
  isExpanded: (pageId: string) => boolean;
}) {
  if (activePanel === "pages") {
    return (
      <EditorFlyoutSurface>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Pages</p>
          {canEdit && <CreatePageDialog siteId={site._id} />}
        </div>

        <ScrollArea className="h-[min(60vh,32rem)]">
          <div className="p-2">
            {rootPages.length > 0 ? (
              <SidebarMenu>
                <SortablePageTree
                  pages={rootPages}
                  allPages={navPages}
                  selectedPageId={selectedPageId}
                  siteId={site._id}
                  defaultPageId={site.defaultPageId}
                  onSelect={onSelectPage}
                  isExpanded={isExpanded}
                  onToggleExpand={toggleExpand}
                  onSetExpanded={setExpanded}
                />
              </SidebarMenu>
            ) : (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No pages yet.
              </div>
            )}
          </div>
        </ScrollArea>
      </EditorFlyoutSurface>
    );
  }

  if (activePanel === "site") {
    return (
      <EditorFlyoutSurface>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <SiteConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </EditorFlyoutSurface>
    );
  }

  if (activePanel === "navigation") {
    return (
      <EditorFlyoutSurface>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <NavigationConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </EditorFlyoutSurface>
    );
  }

  if (activePanel === "customization") {
    return (
      <EditorFlyoutSurface>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <CustomizationConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </EditorFlyoutSurface>
    );
  }

  const elements = getElementsByCategory(activePanel);

  if (activePanel === "blocks") {
    const byType = new Map(elements.map((e) => [e.type, e]));
    return (
      <EditorFlyoutSurface>
        {!canEdit ? (
          <div className="px-4 py-4 text-sm text-muted-foreground">
            You have view-only access. Contact an admin to request edit
            permissions.
          </div>
        ) : (
          <ScrollArea className="h-[min(60vh,32rem)]">
            {BLOCK_GROUPS.map((group) => {
              const groupEntries = group.types
                .map((type) => byType.get(type))
                .filter((e): e is AnyRegistryEntry => e !== undefined);
              if (groupEntries.length === 0) return null;
              return (
                <ElementGrid
                  key={group.title}
                  title={group.title}
                  entries={groupEntries}
                  onSelect={onSelectElement}
                />
              );
            })}
          </ScrollArea>
        )}
      </EditorFlyoutSurface>
    );
  }

  return (
    <EditorFlyoutSurface>
      {!canEdit ? (
        <div className="px-4 py-4 text-sm text-muted-foreground">
          You have view-only access. Contact an admin to request edit
          permissions.
        </div>
      ) : (
        <ScrollArea className="h-[min(60vh,32rem)]">
          <ElementGrid
            title={CATEGORY_TITLES[activePanel]}
            entries={elements}
            onSelect={onSelectElement}
          />
          {activePanel === "layouts" && onEnableTabs && (
            <div className="px-4 pb-4">
              <ElementCard
                description="Adds a tabbed section so visitors can switch between groups of layouts on this page."
                label="Tabs"
                icon={PanelTop}
                preview={TabsPreview}
                onClick={onEnableTabs}
              />
            </div>
          )}
        </ScrollArea>
      )}
    </EditorFlyoutSurface>
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
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    site._id,
  );

  const navPages = pages.filter((page) => !page.isSubpageContent);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((a, b) => a.order - b.order);

  const syncPanelPosition = useCallback((panelId: RailPanelId) => {
    const button = buttonRefs.current[panelId];
    const panel = panelRef.current;
    if (!button || !panel) {
      return;
    }

    panel.style.top = `${button.offsetTop}px`;
  }, []);

  const clearPendingClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openPanel = (panelId: RailPanelId) => {
    clearPendingClose();
    setActivePanel(panelId);
    requestAnimationFrame(() => {
      syncPanelPosition(panelId);
    });
  };

  const scheduleClose = () => {
    clearPendingClose();
    const delay =
      activePanel && activePanel !== "pages"
        ? CONFIG_PANEL_CATEGORIES.includes(activePanel)
          ? 240
          : 140
        : 140;
    closeTimeoutRef.current = setTimeout(() => {
      setActivePanel(null);
    }, delay);
  };

  useEffect(() => {
    if (!activePanel) {
      return;
    }

    const handleResize = () => {
      syncPanelPosition(activePanel);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePanel(null);
      }
    };

    syncPanelPosition(activePanel);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePanel, syncPanelPosition]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleSelectPage = (pageId: string) => {
    clearSelection();
    onSelectPage(pageId);
    setActivePanel(null);
  };

  const handleSelectElement = (type: string) => {
    const layoutTypes = [
      "single",
      "rows",
      "columns",
      "grid",
      "spacer",
      "vertical",
    ];

    if (layoutTypes.includes(type)) {
      onAddLayout?.(type as LayoutType);
      return;
    }

    onAddBlock?.(type as LayoutBlockType);
  };

  return (
    <div
      className="pointer-events-auto relative"
      onMouseEnter={clearPendingClose}
      onMouseLeave={scheduleClose}
    >
      <div className="rounded-[2rem] border bg-background/90 p-2 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-1">
          {RAIL_ITEMS.map((item) => {
            const categoryId: ElementCategory | null =
              item.id === "pages" ? null : item.id;
            const isDisabled =
              !canEdit && item.id !== "pages"
                ? true
                : !!(
                    categoryId &&
                    SLOT_REQUIRED_CATEGORIES.includes(categoryId) &&
                    !selectedSlotId
                  );

            const disabledTooltip =
              isDisabled &&
              categoryId &&
              SLOT_REQUIRED_CATEGORIES.includes(categoryId) &&
              !selectedSlotId
                ? "Select a section on the page first"
                : undefined;

            return (
              <FloatingRailButton
                key={item.id}
                active={activePanel === item.id}
                disabled={isDisabled}
                icon={item.icon}
                label={item.label}
                tooltip={disabledTooltip}
                onClick={() => {
                  if (activePanel === item.id) {
                    setActivePanel(null);
                    return;
                  }
                  openPanel(item.id);
                }}
                onFocus={() => openPanel(item.id)}
                onMouseEnter={() => openPanel(item.id)}
                registerRef={(node) => {
                  buttonRefs.current[item.id] = node;
                }}
              />
            );
          })}
          <Separator className="mx-1 mt-2 w-auto bg-border/80" />
          <RailUndoRedoControls />
        </div>
      </div>

      {activePanel && (
        <div ref={panelRef} className="absolute left-full ml-3">
          <FloatingRailFlyout
            activePanel={activePanel}
            canEdit={canEdit}
            navPages={navPages}
            onEnableTabs={onEnableTabs}
            onSelectElement={handleSelectElement}
            onSelectPage={handleSelectPage}
            rootPages={rootPages}
            selectedPageId={selectedPageId}
            setExpanded={setExpanded}
            site={site}
            toggleExpand={toggleExpand}
            isExpanded={isExpanded}
          />
        </div>
      )}
    </div>
  );
}
