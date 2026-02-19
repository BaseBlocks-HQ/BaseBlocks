"use client";

import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { ViewerProps } from "../types";

// Configure PDF.js worker using CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfViewer({ file, renderControls }: ViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(!!file.searchTerm);
  const [searchInput, setSearchInput] = useState(file.searchTerm ?? "");
  const [currentMatch, setCurrentMatch] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [renderedTextLayers, setRenderedTextLayers] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<HTMLElement[]>([]);
  const hasScrolledToFirstMatch = useRef(false);

  // Track container width for responsive PDF sizing
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      // Subtract padding (32px total = 16px each side)
      const width = container.clientWidth - 32;
      setContainerWidth(width > 0 ? width : null);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Track when a text layer finishes rendering
  const handleTextLayerSuccess = useCallback(() => {
    setRenderedTextLayers((prev) => prev + 1);
  }, []);

  // Reset match refs when search changes
  useEffect(() => {
    matchRefs.current = [];
    setCurrentMatch(0);
    setTotalMatches(0);
    // Only reset scroll flag if user manually changed search
    if (searchInput !== file.searchTerm) {
      hasScrolledToFirstMatch.current = false;
    }
  }, [searchInput, file.searchTerm]);

  // Search for marks and scroll to first match after text layers render
  useEffect(() => {
    if (!searchInput.trim() || renderedTextLayers === 0) return;

    // Search for marks in DOM
    const marks = containerRef.current?.querySelectorAll("mark");
    if (marks && marks.length > 0) {
      matchRefs.current = Array.from(marks) as HTMLElement[];
      setTotalMatches(marks.length);

      // Scroll to first match if we have a search term from props and haven't scrolled yet
      if (file.searchTerm && !hasScrolledToFirstMatch.current) {
        marks[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
        setCurrentMatch(1);
        hasScrolledToFirstMatch.current = true;
      }
    }
  }, [searchInput, renderedTextLayers, numPages, file.searchTerm]);

  // Custom text renderer for highlighting
  const textRenderer = useCallback(
    ({ str }: { str: string; itemIndex: number }) => {
      if (!searchInput.trim()) return str;

      const regex = new RegExp(
        `(${searchInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
        "gi",
      );
      return str.replace(
        regex,
        '<mark style="background-color: #fef08a; padding: 1px 2px; border-radius: 2px;">$1</mark>',
      );
    },
    [searchInput],
  );

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchInput("");
      }
      return !prev;
    });
  }, []);

  const jumpToMatch = useCallback(
    (direction: "next" | "prev") => {
      if (matchRefs.current.length === 0) return;

      let newMatch: number;
      if (direction === "next") {
        newMatch = currentMatch >= totalMatches ? 1 : currentMatch + 1;
      } else {
        newMatch = currentMatch <= 1 ? totalMatches : currentMatch - 1;
      }

      const matchElement = matchRefs.current[newMatch - 1];
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: "smooth", block: "center" });
        setCurrentMatch(newMatch);
      }
    },
    [currentMatch, totalMatches],
  );

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (e.shiftKey) {
          jumpToMatch("prev");
        } else {
          jumpToMatch("next");
        }
      }
    },
    [jumpToMatch],
  );

  // Register controls with parent
  useEffect(() => {
    if (!renderControls) return;

    renderControls(
      <>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", showSearch && "bg-muted")}
          onClick={toggleSearch}
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
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="h-7 w-40 text-xs pr-6"
                autoFocus
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
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
              onClick={() => jumpToMatch("prev")}
              disabled={totalMatches === 0}
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => jumpToMatch("next")}
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
          onClick={handleZoomOut}
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
          onClick={handleZoomIn}
          disabled={scale >= 3}
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
      </>,
    );
  }, [
    renderControls,
    scale,
    showSearch,
    searchInput,
    currentMatch,
    totalMatches,
    handleZoomIn,
    handleZoomOut,
    toggleSearch,
    handleSearchKeyDown,
    jumpToMatch,
  ]);

  // Generate page numbers array
  const pageNumbers = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages],
  );

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load PDF: {error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-muted/20">
      <Document
        file={file.url}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setRenderedTextLayers(0);
          hasScrolledToFirstMatch.current = false;
          setIsLoading(false);
        }}
        onLoadError={(err) => {
          setError(err.message);
          setIsLoading(false);
        }}
        loading={
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading PDF...</p>
          </div>
        }
        className="flex flex-col items-center py-4 gap-4"
      >
        {pageNumbers.map((pageNumber) => (
          <Page
            key={pageNumber}
            pageNumber={pageNumber}
            width={containerWidth ? containerWidth * scale : undefined}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            customTextRenderer={textRenderer}
            onRenderTextLayerSuccess={handleTextLayerSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
            className="shadow-lg"
          />
        ))}
      </Document>
    </div>
  );
}
