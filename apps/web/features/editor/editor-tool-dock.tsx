"use client";

import { BlockPickerPanel } from "@/features/editor/block-picker-panel";
import { PagesPanel } from "@/features/editor/pages-panel";
import {
  useEditorBlockPicker,
  useEditorSite,
} from "@/features/editor/editor-state";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { Popover, PopoverAnchor, PopoverContent } from "@baseblocks/ui/popover";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  IconAppStack,
  IconFile,
  IconGear,
  IconSidebarLeftHide,
  IconSidebarLeftShow,
} from "nucleo-glass";

const SiteSettingsPanel = dynamic(() =>
  import("@/features/editor/site-settings-panel").then(
    (module) => module.SiteSettingsPanel,
  ),
);

interface EditorToolDockProps {
  expanded: boolean;
  site: { _id: Id<"sites">; defaultPageId?: Id<"pages"> };
  pages: PageListItem[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onExpandedChange: (expanded: boolean) => void;
}

type EditorTool = "pages" | "blocks" | "site";

const TOOLS: Array<{ id: EditorTool; label: string; icon: ReactNode }> = [
  { id: "pages", label: "Pages", icon: <IconFile /> },
  { id: "blocks", label: "Blocks", icon: <IconAppStack /> },
  { id: "site", label: "Site", icon: <IconGear /> },
];

export function EditorToolDock({
  expanded,
  site,
  pages,
  selectedPageId,
  onSelectPage,
  onExpandedChange,
}: EditorToolDockProps) {
  const { canEdit } = useEditorSite();
  const { items: blockPickerItems } = useEditorBlockPicker();
  const isHorizontal = useIsMobile();
  const [activeTool, setActiveTool] = useState<EditorTool>("pages");
  const [hoveredTool, setHoveredTool] = useState<EditorTool | null>(null);
  const [pinnedTool, setPinnedTool] = useState<EditorTool | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    onSelectPage(pageId);
  };

  const openTool = pinnedTool ?? hoveredTool;
  const DockToggleIcon = expanded ? IconSidebarLeftHide : IconSidebarLeftShow;

  const pinOpenTool = () => {
    if (!openTool) return;
    clearCloseTimer();
    setActiveTool(openTool);
    setHoveredTool(null);
    setPinnedTool(openTool);
  };

  const panel = (tool: EditorTool) => (
    <ToolPanel
      activeTool={tool}
      canEdit={canEdit}
      pages={pages}
      onSelectPage={selectPage}
      selectedPageId={selectedPageId}
      site={site}
    />
  );

  return (
    <aside
      className="pointer-events-auto fixed bottom-3 left-1/2 z-30 -translate-x-1/2 md:bottom-auto md:left-4 md:top-1/2 md:translate-x-0 md:-translate-y-1/2"
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
              "flex h-10 w-36 flex-col-reverse overflow-hidden rounded-2xl bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur-md transition-[width,height] duration-200 ease-out md:h-36 md:w-10 md:flex-row",
              expanded &&
                "h-[min(78vh,42rem)] w-[min(22rem,calc(100vw-1.5rem))] md:h-[min(calc(50vh+2rem),40rem)] md:w-[17rem] lg:w-[22.5rem]",
            )}
          >
            <nav className="flex shrink-0 self-center flex-row gap-0.5 p-1 md:flex-col">
              {TOOLS.map((tool) => {
                const disabled =
                  (!canEdit && tool.id !== "pages") ||
                  (tool.id === "blocks" && blockPickerItems.length === 0);

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
                  onExpandedChange(!expanded);
                }}
                size="icon"
                variant="ghost"
              >
                <DockToggleIcon className={cn(isHorizontal && "-rotate-90")} />
              </Button>
            </nav>

            {expanded ? (
              <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
                {panel(activeTool)}
              </div>
            ) : null}
          </div>
        </PopoverAnchor>

        {!expanded && openTool ? (
          <PopoverContent
            align={isHorizontal ? "center" : "start"}
            className="max-h-[min(70vh,40rem)] w-[min(22rem,calc(100vw-1.5rem))] overflow-y-auto rounded-[1.5rem] border-0 bg-sidebar/95 p-0 text-sidebar-foreground shadow-2xl backdrop-blur-md md:max-h-[min(calc(50vh+2rem),40rem)]"
            onInteractOutside={(event) => {
              const target = event.target;
              if (
                target instanceof Element &&
                target.closest(
                  '[data-slot="dropdown-menu-content"], [data-slot="dialog-content"], [data-slot="dialog-overlay"], [data-slot="alert-dialog-content"], [data-slot="alert-dialog-overlay"]',
                )
              ) {
                event.preventDefault();
              }
            }}
            onMouseEnter={clearCloseTimer}
            onMouseLeave={schedulePreviewClose}
            onPointerDownCapture={pinOpenTool}
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
  pages,
  onSelectPage,
  selectedPageId,
  site,
}: {
  activeTool: EditorTool;
  canEdit: boolean;
  pages: PageListItem[];
  onSelectPage: (pageId: string) => void;
  selectedPageId?: string;
  site: { _id: Id<"sites">; defaultPageId?: Id<"pages"> };
}) {
  if (activeTool === "pages") {
    return (
      <PagesPanel
        canEdit={canEdit}
        onSelectPage={onSelectPage}
        pages={pages}
        selectedPageId={selectedPageId}
        site={site}
      />
    );
  }

  if (activeTool === "site") {
    return <SiteSettingsPanel siteId={site._id} />;
  }

  if (activeTool === "blocks") {
    return <BlockPickerPanel />;
  }

  return null;
}
