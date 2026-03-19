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
import { MoreHorizontal, PanelTop, Redo2, Undo2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
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

// Mobile rail sizing: h-9 w-9 buttons (36px) + gap-1 (4px) + p-1.5 padding
const BUTTON_SLOT_MOBILE = 40; // 36px button + 4px gap
const RAIL_PADDING_MOBILE = 12; // p-1.5 (6px) * 2 sides
const FIXED_RIGHT_MOBILE = 85; // sep(1) + gap(4) + undo(36) + gap(4) + redo(36) + gaps
const RAIL_MARGIN = 24; // inset-x-3 (12px) * 2 sides

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
        "flex h-9 w-9 items-center justify-center rounded-2xl border transition-colors",
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

function RailUndoRedoControls({ horizontal = false }: { horizontal?: boolean }) {
  const { currentPageId } = useEditorUi();
  const { undo, redo, canUndo, canRedo, isUndoRedoExecuting } = useEditorUndo();

  return (
    <div className={cn("flex gap-1", horizontal ? "flex-row" : "flex-col pt-2")}>
      <Button
        variant="ghost"
        size="icon-sm"
        className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-accent/55 hover:text-foreground"
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
        className="h-9 w-9 rounded-2xl text-muted-foreground hover:bg-accent/55 hover:text-foreground"
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

function EllipsisButton({
  overflowItems,
  activePanel,
  onSelect,
}: {
  overflowItems: typeof RAIL_ITEMS;
  activePanel: RailPanelId | null;
  onSelect: (id: RailPanelId) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasActiveOverflow = overflowItems.some((item) => item.id === activePanel);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-2xl border transition-colors",
            hasActiveOverflow
              ? "border-border bg-accent/70 text-foreground shadow-sm"
              : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/55 hover:text-foreground",
          )}
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="sr-only">More options</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={8}
        className="flex w-auto flex-row gap-1 rounded-[32px] border bg-background/88 p-2 shadow-xl backdrop-blur-md"
      >
        {overflowItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors",
              activePanel === item.id
                ? "border-border bg-accent/70 text-foreground shadow-sm"
                : "border-transparent bg-transparent text-muted-foreground hover:bg-accent/55 hover:text-foreground",
            )}
            onClick={() => {
              setOpen(false);
              onSelect(item.id);
            }}
          >
            {item.icon}
          </button>
        ))}
      </PopoverContent>
    </Popover>
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
  const [isMobile, setIsMobile] = useState(false);
  const [visibleCount, setVisibleCount] = useState(RAIL_ITEMS.length);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  const railWrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    site._id,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");

    const computeVisible = () => {
      const available =
        window.innerWidth - RAIL_MARGIN - RAIL_PADDING_MOBILE - FIXED_RIGHT_MOBILE;
      return Math.min(
        RAIL_ITEMS.length,
        Math.max(1, Math.floor(available / BUTTON_SLOT_MOBILE)),
      );
    };

    const onMqChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      setVisibleCount(mobile ? computeVisible() : RAIL_ITEMS.length);
    };

    const handleResize = () => {
      if (mq.matches) setVisibleCount(computeVisible());
    };

    onMqChange(mq);
    mq.addEventListener("change", onMqChange);
    window.addEventListener("resize", handleResize);
    return () => {
      mq.removeEventListener("change", onMqChange);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Close flyout on mobile when tapping outside the rail + panel
  useEffect(() => {
    if (!isMobile || !activePanel) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !railWrapperRef.current?.contains(target) &&
        !(target as HTMLElement).closest?.("[data-radix-popper-content-wrapper]")
      ) {
        setActivePanel(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isMobile, activePanel]);

  const navPages = pages.filter((page) => !page.isSubpageContent);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((a, b) => a.order - b.order);

  const syncPanelPosition = useCallback(
    (panelId: RailPanelId) => {
      if (isMobile) return;
      const button = buttonRefs.current[panelId];
      const panel = panelRef.current;
      if (!button || !panel) return;
      panel.style.top = `${button.offsetTop + button.offsetHeight / 2}px`;
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
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeyDown);
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

  const clampedVisible = Math.min(visibleCount, RAIL_ITEMS.length);
  const visibleItems = isMobile ? RAIL_ITEMS.slice(0, clampedVisible) : RAIL_ITEMS;
  const overflowItems = isMobile ? RAIL_ITEMS.slice(clampedVisible) : [];
  const needsEllipsis = overflowItems.length > 0;

  const handleButtonClick = (itemId: RailPanelId) => {
    if (activePanel === itemId) {
      setActivePanel(null);
      return;
    }
    openPanel(itemId);
  };

  return (
    <div
      ref={railWrapperRef}
      className="pointer-events-auto relative"
      onMouseEnter={isMobile ? undefined : clearPendingClose}
      onMouseLeave={isMobile ? undefined : scheduleClose}
    >
      <div className="rounded-[32px] border bg-background/88 p-1.5 shadow-xl backdrop-blur-md">
        <div className={cn("flex gap-1", isMobile ? "flex-row items-center" : "flex-col")}>
          {visibleItems.map((item) => {
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
                onClick={() => handleButtonClick(item.id)}
                onFocus={() => openPanel(item.id)}
                onMouseEnter={isMobile ? () => {} : () => openPanel(item.id)}
                registerRef={(node) => {
                  buttonRefs.current[item.id] = node;
                }}
              />
            );
          })}

          {needsEllipsis && (
            <EllipsisButton
              overflowItems={overflowItems}
              activePanel={activePanel}
              onSelect={handleButtonClick}
            />
          )}

          <Separator
            orientation={isMobile ? "vertical" : "horizontal"}
            className={cn(isMobile ? "mx-0 my-1 h-auto w-px self-stretch" : "mx-1 mt-2 w-auto")}
          />
          <RailUndoRedoControls horizontal={isMobile} />
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
          style={isMobile ? undefined : { transform: "translateY(-50%)" }}
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
