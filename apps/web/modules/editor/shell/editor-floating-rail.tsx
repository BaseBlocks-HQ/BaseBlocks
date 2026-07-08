"use client";

import {
  type AnyRegistryEntry,
  getElementsByCategory,
} from "@/modules/site-elements/manifest";
import { usePageExpandState } from "@/lib/use-page-expand-state";
import type { ElementCategory } from "@/modules/site-elements/manifest";
import { themedPickerImagePreview } from "@/modules/site-elements/shared/picker-image-preview";
import { CustomizationConfigPanel } from "@/modules/editor/settings/customization/config-panel";
import { NavigationConfigPanel } from "@/modules/editor/settings/navigation/config-panel";
import { SiteConfigPanel } from "@/modules/editor/settings/site/config-panel";
import { PageTree } from "@/modules/editor/navigation/page-tree";
import {
  useEditorSite,
  useEditorUi,
} from "@/modules/editor/state/editor-context";
import type { Id } from "@baseblocks/backend";
import type { LayoutType, PageListItem } from "@baseblocks/domain";
import type { ElementType } from "@baseblocks/domain/elements";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@baseblocks/ui/popover";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Separator } from "@baseblocks/ui/separator";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@baseblocks/ui/tooltip";
import { MoreHorizontal, PanelTop } from "lucide-react";
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
import { ElementCard } from "@/modules/editor/element-picker/element-card";
import { ElementGrid } from "@/modules/editor/element-picker/element-grid";
import { CreatePageDialog } from "../pages/create-page-dialog";

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
    label: "Layouts",
    icon: CATEGORY_ICONS.layouts,
  },
  {
    id: "blocks",
    label: "Blocks",
    icon: CATEGORY_ICONS.blocks,
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: CATEGORY_ICONS.navigation,
  },
  {
    id: "customization",
    label: "Customization",
    icon: CATEGORY_ICONS.customization,
  },
  {
    id: "site",
    label: "Site Settings",
    icon: CATEGORY_ICONS.site,
  },
];

const SLOT_REQUIRED_CATEGORIES: ElementCategory[] = ["blocks"];
const BUTTON_SLOT_MOBILE = 40;
const RAIL_PADDING_MOBILE = 12;
const FIXED_RIGHT_MOBILE = 85;
const RAIL_MARGIN = 24;
const editorFlyoutSurfaceClassName =
  "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-2xl backdrop-blur-md sm:w-[min(22rem,calc(100vw-6rem))]";

const BLOCK_GROUPS: Array<{ title: string; types: ElementType[] }> = [
  {
    title: "Writing",
    types: ["heading", "paragraph", "richtext", "callout", "code"],
  },
  { title: "Structure", types: ["divider", "block-spacer"] },
  { title: "Files", types: ["image", "file"] },
  {
    title: "Advanced",
    types: ["page", "directory", "flowchart", "decision-tree"],
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

function EditorFlyoutSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(editorFlyoutSurfaceClassName, className)} {...props} />
  );
}

function EllipsisButton({
  activePanel,
  onSelect,
  overflowItems,
}: {
  activePanel: RailPanelId | null;
  onSelect: (id: RailPanelId) => void;
  overflowItems: typeof RAIL_ITEMS;
}) {
  const [open, setOpen] = useState(false);
  const hasActiveOverflow = overflowItems.some(
    (item) => item.id === activePanel,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-[1.15rem] border transition-colors",
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
        className="flex w-auto flex-row gap-1 rounded-[32px] border border-sidebar-border bg-sidebar/95 p-1.5 text-sidebar-foreground backdrop-blur-md"
      >
        {overflowItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-[1.15rem] border transition-colors",
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
      <EditorFlyoutSurface>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold">Pages</p>
          {canEdit && <CreatePageDialog siteId={site._id} />}
        </div>

        <ScrollArea className="h-[min(60vh,32rem)]">
          <div className="p-2">
            {rootPages.length > 0 ? (
              <SidebarMenu>
                <PageTree
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
            title={CATEGORY_TITLES[activePanel] ?? "Elements"}
            entries={elements}
            onSelect={onSelectElement}
          />
          {activePanel === "layouts" && onEnableTabs && (
            <div className="px-4 pb-4">
              <ElementCard
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
  const isMobile = useIsMobile();
  const [activePanel, setActivePanel] = useState<RailPanelId | null>(null);
  const [visibleCount, setVisibleCount] = useState(RAIL_ITEMS.length);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const panelRef = useRef<HTMLDivElement | null>(null);
  const railWrapperRef = useRef<HTMLDivElement | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, toggleExpand, setExpanded } = usePageExpandState(
    EXPANDED_PAGES_KEY,
    site._id,
  );

  const navPages = pages.filter((page) => page.showInNavigation !== false);
  const rootPages = navPages
    .filter((page) => !page.parentId)
    .sort((a, b) => a.order - b.order);

  useEffect(() => {
    if (!isMobile) {
      return;
    }

    const computeVisible = () => {
      const available =
        window.innerWidth -
        RAIL_MARGIN -
        RAIL_PADDING_MOBILE -
        FIXED_RIGHT_MOBILE;
      return Math.min(
        RAIL_ITEMS.length,
        Math.max(1, Math.floor(available / BUTTON_SLOT_MOBILE)),
      );
    };

    const handleResize = () => setVisibleCount(computeVisible());
    const animationFrame = requestAnimationFrame(handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, [isMobile]);

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
    if (!isMobile || !activePanel) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        railWrapperRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setActivePanel(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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

    onAddBlock?.(type as ElementType);
  };

  const clampedVisible = isMobile
    ? Math.min(visibleCount, RAIL_ITEMS.length)
    : RAIL_ITEMS.length;
  const visibleItems = isMobile
    ? RAIL_ITEMS.slice(0, clampedVisible)
    : RAIL_ITEMS;
  const overflowItems = isMobile ? RAIL_ITEMS.slice(clampedVisible) : [];

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
      <div className="rounded-[32px] border border-sidebar-border bg-sidebar/95 p-1.5 text-sidebar-foreground backdrop-blur-md sm:rounded-[2rem] sm:bg-sidebar/95 sm:p-2">
        <div
          className={cn(
            "flex gap-1",
            isMobile ? "flex-row items-center" : "flex-col",
          )}
        >
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
                onClick={() => handleButtonClick(item.id)}
                onFocus={() => openPanel(item.id)}
                onMouseEnter={isMobile ? () => {} : () => openPanel(item.id)}
                registerRef={(node) => {
                  buttonRefs.current[item.id] = node;
                }}
              />
            );
          })}

          {overflowItems.length > 0 ? (
            <EllipsisButton
              activePanel={activePanel}
              onSelect={handleButtonClick}
              overflowItems={overflowItems}
            />
          ) : null}

          {overflowItems.length === 0 ? null : (
            <Separator
              orientation={isMobile ? "vertical" : "horizontal"}
              className={cn(
                "bg-border/80",
                isMobile
                  ? "mx-0.5 h-7 w-px self-center"
                  : "mt-2 h-px w-7 self-center",
              )}
            />
          )}
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
