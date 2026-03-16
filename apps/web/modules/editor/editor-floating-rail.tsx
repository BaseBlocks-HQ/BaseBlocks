"use client";

import { getElementsByCategory } from "@/modules/elements/framework/registry";
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
import type { ElementCategory } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Separator } from "@baseblocks/ui/separator";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import { PanelTop, Redo2, Undo2 } from "lucide-react";
import {
  IconColorPalette,
  IconFile,
  IconGear,
  IconImage,
  IconPen,
  IconRectLayoutGrid,
  IconSitemap,
  IconSquareGrid2,
  IconStackPerspective,
} from "nucleo-glass";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { ElementCard } from "./components/element-picker/element-card";
import { ElementGrid } from "./components/element-picker/element-grid";
import { CreatePageDialog } from "./create-page-dialog";

// Failure modes:
// - Hover panels close while moving between the rail and the flyout.
// - Slot-only categories open without a selected slot and create dead-end UI.
// - View-only users see mutation affordances they cannot use.
// - Pages flyout breaks tree semantics by rendering list items outside a list wrapper.

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
  sections: "Sections",
  blocks: "Blocks",
  media: "Media",
  forms: "Forms",
};

const CATEGORY_ICONS: Record<ElementCategory, ReactNode> = {
  site: <IconGear className="h-5 w-5" />,
  customization: <IconColorPalette className="h-5 w-5" />,
  navigation: <IconSitemap className="h-5 w-5" />,
  layouts: <IconRectLayoutGrid className="h-5 w-5" />,
  sections: <IconStackPerspective className="h-5 w-5" />,
  blocks: <IconSquareGrid2 className="h-5 w-5" />,
  media: <IconImage className="h-5 w-5" />,
  forms: <IconPen className="h-5 w-5" />,
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
    id: "site",
    label: CATEGORY_TITLES.site,
    icon: CATEGORY_ICONS.site,
  },
  {
    id: "customization",
    label: CATEGORY_TITLES.customization,
    icon: CATEGORY_ICONS.customization,
  },
  {
    id: "navigation",
    label: CATEGORY_TITLES.navigation,
    icon: CATEGORY_ICONS.navigation,
  },
  {
    id: "layouts",
    label: CATEGORY_TITLES.layouts,
    icon: CATEGORY_ICONS.layouts,
  },
  {
    id: "sections",
    label: CATEGORY_TITLES.sections,
    icon: CATEGORY_ICONS.sections,
  },
  {
    id: "blocks",
    label: CATEGORY_TITLES.blocks,
    icon: CATEGORY_ICONS.blocks,
  },
  {
    id: "media",
    label: CATEGORY_TITLES.media,
    icon: CATEGORY_ICONS.media,
  },
  {
    id: "forms",
    label: CATEGORY_TITLES.forms,
    icon: CATEGORY_ICONS.forms,
  },
];

const SLOT_REQUIRED_CATEGORIES: ElementCategory[] = [
  "blocks",
  "sections",
  "media",
  "forms",
];

const CONFIG_PANEL_CATEGORIES: ElementCategory[] = [
  "site",
  "customization",
  "navigation",
];

function FloatingRailButton({
  active,
  disabled,
  icon,
  onClick,
  onFocus,
  onMouseEnter,
  registerRef,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  onClick: () => void;
  onFocus: () => void;
  onMouseEnter: () => void;
  registerRef: (node: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={registerRef}
      type="button"
      aria-disabled={disabled}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
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
}

function RailUndoRedoControls() {
  const { currentPageId } = useEditorUi();
  const { undo, redo, canUndo, canRedo, isUndoRedoExecuting } = useEditorUndo();

  return (
    <div className="flex flex-col gap-1 pt-2">
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-11 w-11 rounded-2xl text-muted-foreground hover:bg-accent/55 hover:text-foreground"
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
        className="h-11 w-11 rounded-2xl text-muted-foreground hover:bg-accent/55 hover:text-foreground"
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
  const [panelTop, setPanelTop] = useState(0);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    site._id,
  );

  const navPages = pages.filter((page) => !page.isSubpageContent);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((a, b) => a.order - b.order);

  const syncPanelPosition = (panelId: RailPanelId) => {
    const button = buttonRefs.current[panelId];
    if (!button) {
      return;
    }

    setPanelTop(button.offsetTop + button.offsetHeight / 2);
  };

  const clearPendingClose = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const openPanel = (panelId: RailPanelId) => {
    clearPendingClose();
    syncPanelPosition(panelId);
    setActivePanel(panelId);
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

    const setActivePanelPosition = () => {
      const button = buttonRefs.current[activePanel];
      if (!button) {
        return;
      }
      setPanelTop(button.offsetTop + button.offsetHeight / 2);
    };

    setActivePanelPosition();

    const handleResize = () => {
      setActivePanelPosition();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActivePanel(null);
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePanel]);

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

  const renderPanel = () => {
    if (!activePanel) {
      return null;
    }

    if (activePanel === "pages") {
      return (
        <div className="w-[min(22rem,calc(100vw-6rem))] overflow-hidden rounded-3xl border bg-background/96 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Pages</p>
              <p className="text-xs text-muted-foreground">
                Choose a page to edit
              </p>
            </div>
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
                    onSelect={handleSelectPage}
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
        </div>
      );
    }

    if (activePanel === "site") {
      return (
        <div className="w-[min(22rem,calc(100vw-6rem))] overflow-hidden rounded-3xl border bg-background/96 shadow-2xl backdrop-blur-sm">
          <ScrollArea className="h-[min(60vh,32rem)]">
            <SiteConfigPanel siteId={site._id as Id<"sites">} />
          </ScrollArea>
        </div>
      );
    }

    if (activePanel === "navigation") {
      return (
        <div className="w-[min(22rem,calc(100vw-6rem))] overflow-hidden rounded-3xl border bg-background/96 shadow-2xl backdrop-blur-sm">
          <ScrollArea className="h-[min(60vh,32rem)]">
            <NavigationConfigPanel siteId={site._id as Id<"sites">} />
          </ScrollArea>
        </div>
      );
    }

    if (activePanel === "customization") {
      return (
        <div className="w-[min(22rem,calc(100vw-6rem))] overflow-hidden rounded-3xl border bg-background/96 shadow-2xl backdrop-blur-sm">
          <ScrollArea className="h-[min(60vh,32rem)]">
            <CustomizationConfigPanel siteId={site._id as Id<"sites">} />
          </ScrollArea>
        </div>
      );
    }

    const elements = getElementsByCategory(activePanel);

    return (
      <div className="w-[min(22rem,calc(100vw-6rem))] overflow-hidden rounded-3xl border bg-background/96 shadow-2xl backdrop-blur-sm">
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
              onSelect={handleSelectElement}
            />
            {activePanel === "layouts" && onEnableTabs && (
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <ElementCard
                    label="Tabs"
                    icon={PanelTop}
                    onClick={onEnableTabs}
                  />
                </div>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    );
  };

  return (
    <div
      className="pointer-events-auto relative"
      onMouseEnter={clearPendingClose}
      onMouseLeave={scheduleClose}
    >
      <div className="rounded-[32px] border bg-background/88 p-2 shadow-xl backdrop-blur-md">
        <div className="flex flex-col gap-1">
          {RAIL_ITEMS.map((item) => {
            const categoryId: ElementCategory | null =
              item.id === "pages" ? null : item.id;
            const disabledReason =
              !canEdit && item.id !== "pages"
                ? "View only"
                : categoryId &&
                    SLOT_REQUIRED_CATEGORIES.includes(categoryId) &&
                    !selectedSlotId
                  ? "Select a slot first"
                  : undefined;
            const isDisabled = Boolean(disabledReason);

            return (
              <FloatingRailButton
                key={item.id}
                active={activePanel === item.id}
                disabled={Boolean(isDisabled)}
                icon={item.icon}
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
          <Separator className="mx-1 mt-2 w-auto" />
          <RailUndoRedoControls />
        </div>
      </div>

      {activePanel && (
        <div
          className="absolute left-full ml-3"
          style={{
            top: panelTop,
            transform: "translateY(-50%)",
          }}
        >
          {renderPanel()}
        </div>
      )}
    </div>
  );
}
