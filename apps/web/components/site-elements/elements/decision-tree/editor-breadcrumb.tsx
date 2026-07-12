"use client";

import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { ChevronLeft, MoreHorizontal } from "lucide-react";

export function DecisionTreeEditorBreadcrumb({
  getNodeName,
  onNavigate,
  path,
}: {
  getNodeName: (nodeId: string) => string;
  onNavigate: (path: string[]) => void;
  path: string[];
}) {
  const currentNodeId = path.at(-1);
  const showCollapsedPath = path.length >= 3;

  return (
    <nav
      aria-label="Decision tree path"
      className="flex h-9 min-w-0 items-center gap-1 px-2 text-xs"
    >
      {path.length > 0 ? (
        <Button
          aria-label="Go up"
          className="mr-0.5 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onNavigate(path.slice(0, -1))}
          size="icon-xs"
          type="button"
          variant="ghost"
        >
          <ChevronLeft className="size-3.5" />
        </Button>
      ) : null}

      {path.length > 0 ? (
        <button
          className="shrink-0 rounded px-1 py-0.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={() => onNavigate([])}
          type="button"
        >
          Root
        </button>
      ) : (
        <span className="px-1 text-muted-foreground">Root</span>
      )}

      {showCollapsedPath ? (
        <>
          <span aria-hidden="true" className="text-muted-foreground/50">
            /
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Show earlier options"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuGroup>
                {path.slice(0, -1).map((nodeId, index) => (
                  <DropdownMenuItem
                    key={nodeId}
                    onClick={() => onNavigate(path.slice(0, index + 1))}
                  >
                    {getNodeName(nodeId)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <span aria-hidden="true" className="text-muted-foreground/50">
            /
          </span>
          <span className="min-w-0 max-w-40 truncate font-medium text-foreground">
            {currentNodeId ? getNodeName(currentNodeId) : null}
          </span>
        </>
      ) : (
        path.map((nodeId, index) => {
          const isCurrent = index === path.length - 1;
          return (
            <span className="contents" key={nodeId}>
              <span aria-hidden="true" className="text-muted-foreground/50">
                /
              </span>
              {isCurrent ? (
                <span className="min-w-0 max-w-40 truncate font-medium text-foreground">
                  {getNodeName(nodeId)}
                </span>
              ) : (
                <button
                  className="min-w-0 max-w-32 truncate rounded px-1 py-0.5 text-muted-foreground transition hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => onNavigate(path.slice(0, index + 1))}
                  type="button"
                >
                  {getNodeName(nodeId)}
                </button>
              )}
            </span>
          );
        })
      )}
    </nav>
  );
}
