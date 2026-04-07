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
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { cn } from "@baseblocks/ui/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Separator } from "@baseblocks/ui/separator";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
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
    id: "blocks",
    label: CATEGORY_TITLES.blocks,
    icon: CATEGORY_ICONS.blocks,
  },
];

const SLOT_REQUIRED_CATEGORIES: ElementCategory[] = ["blocks"];

const CONFIG_PANEL_CATEGORIES: ElementCategory[] = [
  "site",
  "customization",
  "navigation",
];

const RAIL_FLYOUT_CLASS =
  "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border bg-background/96 shadow-2xl backdrop-blur-sm sm:w-[min(22rem,calc(100vw-6rem))]";

function FloatingRailButton({
  active,
  disabled,
  icon,
  label,
  onClick,
  onFocus,
  onMouseEnter,
  registerRef,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
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
      aria-label={label}
      title={label}
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
}

function RailUndoRedoControls() {
  const { currentPageId } = useEditorUi();
  const { undo, redo, canUndo, canRedo, isUndoRedoExecuting } = useEditorUndo();
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 sm:flex-col sm:gap-1",
        isMobile ? "pl-0.5" : "pt-2",
      )}
    >
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
      <div className={RAIL_FLYOUT_CLASS}>
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
      </div>
    );
  }

  if (activePanel === "site") {
    return (
      <div className={RAIL_FLYOUT_CLASS}>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <SiteConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </div>
    );
  }

  if (activePanel === "navigation") {
    return (
      <div className={RAIL_FLYOUT_CLASS}>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <NavigationConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </div>
    );
  }

  if (activePanel === "customization") {
    return (
      <div className={RAIL_FLYOUT_CLASS}>
        <ScrollArea className="h-[min(60vh,32rem)]">
          <CustomizationConfigPanel siteId={site._id as Id<"sites">} />
        </ScrollArea>
      </div>
    );
  }

  const elements = getElementsByCategory(activePanel);

  return (
    <div className={RAIL_FLYOUT_CLASS}>
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
  const isMobile = useIsMobile();
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    site._id,
  );

  const navPages = pages.filter((page) => !page.isSubpageContent);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((a, b) => a.order - b.order);

  const syncPanelPosition = useCallback(
    (panelId: RailPanelId) => {
      if (isMobile) {
        return;
      }

      const button = buttonRefs.current[panelId];
      const panel = panelRef.current;
      if (!button || !panel) {
        return;
      }

      panel.style.top = `${button.offsetTop}px`;
    },
    [isMobile],
  );

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
    if (!isMobile) {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (!isMobile) {
        window.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activePanel, isMobile, syncPanelPosition]);

  useEffect(() => {
    if (!activePanel || !isMobile) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        railRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }

      setActivePanel(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activePanel, isMobile]);

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
      ref={railRef}
      className="pointer-events-auto relative"
      onMouseEnter={isMobile ? undefined : clearPendingClose}
      onMouseLeave={isMobile ? undefined : scheduleClose}
    >
      <div className="rounded-[1.75rem] border bg-background/90 p-1.5 shadow-lg backdrop-blur-md sm:rounded-[2rem] sm:p-2 sm:shadow-xl">
        <div className="flex items-center gap-0.5 sm:flex-col sm:gap-1">
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

            return (
              <FloatingRailButton
                key={item.id}
                active={activePanel === item.id}
                disabled={isDisabled}
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  if (activePanel === item.id) {
                    setActivePanel(null);
                    return;
                  }
                  openPanel(item.id);
                }}
                onFocus={() => openPanel(item.id)}
                onMouseEnter={isMobile ? () => {} : () => openPanel(item.id)}
                registerRef={(node) => {
                  buttonRefs.current[item.id] = node;
                }}
              />
            );
          })}
          <Separator
            orientation={isMobile ? "vertical" : "horizontal"}
            className={cn(
              "bg-border/80",
              isMobile ? "mx-0.5 h-7 w-px self-center" : "mx-1 mt-2 w-auto",
            )}
          />
          <RailUndoRedoControls />
        </div>
      </div>

      {activePanel && (
        <div
          ref={panelRef}
          className={cn(
            "absolute",
            isMobile
              ? "bottom-full left-1/2 mb-3 -translate-x-1/2"
              : "left-full ml-3",
          )}
          style={undefined}
        >
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
