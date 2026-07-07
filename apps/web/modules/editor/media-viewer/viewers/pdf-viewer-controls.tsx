"use client";

import { cn } from "@/lib/utils";
import { ViewerToolbarIconButton } from "@/modules/editor/media-viewer/components/viewer-toolbar-icon-button";
import { Input } from "@baseblocks/ui/input";
import {
  ChevronDown,
  ChevronUp,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface PdfViewerControlsProps {
  currentMatch: number;
  scale: number;
  searchInput: string;
  showSearch: boolean;
  totalMatches: number;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (event: React.KeyboardEvent) => void;
  onJumpToMatch: (direction: "next" | "prev") => void;
  onToggleSearch: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function PdfViewerControls({
  currentMatch,
  scale,
  searchInput,
  showSearch,
  totalMatches,
  onSearchChange,
  onSearchKeyDown,
  onJumpToMatch,
  onToggleSearch,
  onZoomIn,
  onZoomOut,
}: PdfViewerControlsProps) {
  return (
    <>
      <ViewerToolbarIconButton
        className={cn(showSearch && "bg-primary/10 text-primary")}
        label="Search"
        onClick={onToggleSearch}
        pressed={showSearch}
      >
        <Search className="h-4 w-4" />
      </ViewerToolbarIconButton>
      {showSearch && (
        <>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search in PDF…"
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-8 w-40 pr-7 text-xs"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear Search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          {totalMatches > 0 && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {currentMatch}/{totalMatches}
            </span>
          )}
          <ViewerToolbarIconButton
            disabled={totalMatches === 0}
            label="Previous match (Shift+Enter)"
            onClick={() => onJumpToMatch("prev")}
          >
            <ChevronUp className="h-4 w-4" />
          </ViewerToolbarIconButton>
          <ViewerToolbarIconButton
            disabled={totalMatches === 0}
            label="Next match (Enter)"
            onClick={() => onJumpToMatch("next")}
          >
            <ChevronDown className="h-4 w-4" />
          </ViewerToolbarIconButton>
        </>
      )}
      <ViewerToolbarIconButton
        disabled={scale <= 0.5}
        label="Zoom out"
        onClick={onZoomOut}
      >
        <ZoomOut className="h-4 w-4" />
      </ViewerToolbarIconButton>
      <span className="text-xs text-muted-foreground min-w-[3rem] text-center tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <ViewerToolbarIconButton
        disabled={scale >= 3}
        label="Zoom in"
        onClick={onZoomIn}
      >
        <ZoomIn className="h-4 w-4" />
      </ViewerToolbarIconButton>
    </>
  );
}
