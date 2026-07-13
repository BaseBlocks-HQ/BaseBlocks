"use client";

import { usePageExpandState } from "@/components/site-runtime/page-expand-state";
import { useEditorSite } from "@/features/editor/editor-state";
import { CreatePageDialog } from "@/features/editor/pages/create-page-dialog";
import { PageTree } from "@/features/editor/pages/page-tree";
import { SiteConfigPanel } from "@/features/editor/settings/site-settings";
import type { Id } from "@baseblocks/backend";
import type { PageListItem } from "@baseblocks/domain";
import { cn } from "@baseblocks/ui/lib/utils";
import { Button } from "@baseblocks/ui/button";
import { useIsMobile } from "@baseblocks/ui/hooks/use-mobile";
import { Popover, PopoverAnchor, PopoverContent } from "@baseblocks/ui/popover";
import { SidebarMenu } from "@baseblocks/ui/sidebar";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  IconFile,
  IconGear,
  IconSidebarLeftHide,
  IconSidebarLeftShow,
} from "nucleo-glass";

interface EditorToolDockProps {
  expanded: boolean;
  site: { _id: string; defaultPageId?: string };
  pages: PageListItem[];
  selectedPageId?: string;
  onSelectPage: (pageId: string) => void;
  onExpandedChange: (expanded: boolean) => void;
}

type EditorTool = "pages" | "site";

const EXPANDED_PAGES_KEY = "baseblocks_editor_expanded_pages";
const TOOLS: Array<{ id: EditorTool; label: string; icon: ReactNode }> = [
  { id: "pages", label: "Pages", icon: <IconFile /> },
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
  const isHorizontal = useIsMobile();
  const [activeTool, setActiveTool] = useState<EditorTool>("pages");
  const [hoveredTool, setHoveredTool] = useState<EditorTool | null>(null);
  const [pinnedTool, setPinnedTool] = useState<EditorTool | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExpanded, setExpanded, toggleExpand } = usePageExpandState(
    EXPANDED_PAGES_KEY,
    site._id,
  );
  const rootPages = pages
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
      isExpanded={isExpanded}
      pages={pages}
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
              "flex h-10 w-[6.75rem] flex-col-reverse overflow-hidden rounded-2xl bg-sidebar/95 text-sidebar-foreground shadow-xl backdrop-blur-md transition-[width,height] duration-200 ease-out md:h-[6.75rem] md:w-10 md:flex-row",
              expanded &&
                "h-[min(78vh,42rem)] w-[min(22rem,calc(100vw-1.5rem))] md:h-[min(calc(50vh+2rem),40rem)] md:w-[17rem] lg:w-[22.5rem]",
            )}
          >
            <nav className="flex shrink-0 self-center flex-row gap-0.5 p-1 md:flex-col">
              {TOOLS.map((tool) => {
                const disabled = !canEdit && tool.id !== "pages";

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
                  '[data-slot="dropdown-menu-content"], [data-slot="alert-dialog-content"], [data-slot="alert-dialog-overlay"]',
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
  rootPages,
  selectedPageId,
  setExpanded,
  site,
  toggleExpand,
  isExpanded,
}: {
  activeTool: EditorTool;
  canEdit: boolean;
  pages: PageListItem[];
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
            <SidebarMenu className="gap-0.5">
              <PageTree
                allPages={pages}
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

  return null;
}
