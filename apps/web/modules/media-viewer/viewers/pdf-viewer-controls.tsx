"use client";

import { cn } from "@/lib/utils";
import { Button } from "@baseblocks/ui/button";
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
      <Button
        variant="ghost"
        size="icon"
        className={cn("h-7 w-7", showSearch && "bg-muted")}
        onClick={onToggleSearch}
        title="Search"
      >
        <Search className="h-3.5 w-3.5" />
      </Button>
      {showSearch && (
        <>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search in PDF..."
              value={searchInput}
              onChange={(event) => onSearchChange(event.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-7 w-40 text-xs pr-6"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onJumpToMatch("prev")}
            disabled={totalMatches === 0}
            title="Previous match (Shift+Enter)"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onJumpToMatch("next")}
            disabled={totalMatches === 0}
            title="Next match (Enter)"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
      <div className="w-px h-4 bg-border mx-0.5" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomOut}
        disabled={scale <= 0.5}
        title="Zoom out"
      >
        <ZoomOut className="h-3.5 w-3.5" />
      </Button>
      <span className="text-xs text-muted-foreground min-w-[3rem] text-center tabular-nums">
        {Math.round(scale * 100)}%
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7"
        onClick={onZoomIn}
        disabled={scale >= 3}
        title="Zoom in"
      >
        <ZoomIn className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}
