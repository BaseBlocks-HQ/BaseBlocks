"use client";
import { AlertCircle, Loader2 } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { ViewerProps } from "../types";
import { PdfViewerControls } from "./pdf-viewer-controls";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface PdfViewerState {
  containerWidth: number | null;
  currentMatch: number;
  error: string | null;
  numPages: number;
  renderedTextLayers: number;
  scale: number;
  searchInput: string;
  showSearch: boolean;
  totalMatches: number;
}

type PdfViewerAction =
  | { type: "documentLoaded"; numPages: number }
  | { type: "incrementRenderedTextLayers" }
  | { type: "resetSearchMatches" }
  | { type: "setContainerWidth"; value: number | null }
  | { type: "setCurrentMatch"; value: number }
  | { type: "setError"; value: string | null }
  | { type: "setScale"; value: number }
  | { type: "setSearchInput"; value: string }
  | { type: "setSearchState"; value: string }
  | { type: "setShowSearch"; value: boolean }
  | { type: "setTotalMatches"; value: number };

function createPdfViewerState(searchTerm?: string): PdfViewerState {
  return {
    containerWidth: null,
    currentMatch: 0,
    error: null,
    numPages: 0,
    renderedTextLayers: 0,
    scale: 1,
    searchInput: searchTerm ?? "",
    showSearch: Boolean(searchTerm),
    totalMatches: 0,
  };
}

function pdfViewerReducer(
  state: PdfViewerState,
  action: PdfViewerAction,
): PdfViewerState {
  switch (action.type) {
    case "documentLoaded":
      return {
        ...state,
        error: null,
        numPages: action.numPages,
        renderedTextLayers: 0,
      };
    case "incrementRenderedTextLayers":
      return {
        ...state,
        renderedTextLayers: state.renderedTextLayers + 1,
      };
    case "resetSearchMatches":
      return { ...state, currentMatch: 0, totalMatches: 0 };
    case "setContainerWidth":
      return { ...state, containerWidth: action.value };
    case "setCurrentMatch":
      return { ...state, currentMatch: action.value };
    case "setError":
      return { ...state, error: action.value };
    case "setScale":
      return { ...state, scale: action.value };
    case "setSearchInput":
      return { ...state, searchInput: action.value };
    case "setSearchState":
      return {
        ...state,
        searchInput: action.value,
        showSearch: Boolean(action.value),
      };
    case "setShowSearch":
      return { ...state, showSearch: action.value };
    case "setTotalMatches":
      return { ...state, totalMatches: action.value };
    default:
      return state;
  }
}

export function PdfViewer({ file, renderControls }: ViewerProps) {
  const [state, dispatch] = useReducer(
    pdfViewerReducer,
    file.searchTerm,
    createPdfViewerState,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const matchRefs = useRef<HTMLElement[]>([]);
  const hasScrolledToFirstMatch = useRef(false);

  const resetSearchState = useCallback(() => {
    matchRefs.current = [];
    dispatch({ type: "resetSearchMatches" });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      const width = container.clientWidth - 32;
      dispatch({
        type: "setContainerWidth",
        value: width > 0 ? width : null,
      });
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    hasScrolledToFirstMatch.current = false;
    resetSearchState();
    dispatch({ type: "setSearchState", value: file.searchTerm ?? "" });
  }, [file.searchTerm, resetSearchState]);

  const searchForMarks = useCallback(() => {
    if (!state.searchInput.trim()) return;

    const marks = containerRef.current?.querySelectorAll("mark");
    if (marks && marks.length > 0) {
      matchRefs.current = Array.from(marks) as HTMLElement[];
      dispatch({ type: "setTotalMatches", value: marks.length });

      if (file.searchTerm && !hasScrolledToFirstMatch.current) {
        marks[0]?.scrollIntoView({ behavior: "smooth", block: "center" });
        dispatch({ type: "setCurrentMatch", value: 1 });
        hasScrolledToFirstMatch.current = true;
      }
    }
  }, [file.searchTerm, state.searchInput]);

  const handleTextLayerSuccess = useCallback(() => {
    dispatch({ type: "incrementRenderedTextLayers" });
    requestAnimationFrame(searchForMarks);
  }, [searchForMarks]);

  const textRenderer = ({ str }: { str: string; itemIndex: number }) => {
    if (!state.searchInput.trim()) return str;

    const regex = new RegExp(
      `(${state.searchInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    return str.replace(
      regex,
      '<mark style="background-color: #fef08a; padding: 1px 2px; border-radius: 2px;">$1</mark>',
    );
  };

  const handleZoomIn = useCallback(() => {
    dispatch({
      type: "setScale",
      value: Math.min(state.scale + 0.25, 3),
    });
  }, [state.scale]);

  const handleZoomOut = useCallback(() => {
    dispatch({
      type: "setScale",
      value: Math.max(state.scale - 0.25, 0.5),
    });
  }, [state.scale]);

  const toggleSearch = useCallback(() => {
    const nextShowSearch = !state.showSearch;
    if (!nextShowSearch) {
      resetSearchState();
      dispatch({ type: "setSearchInput", value: "" });
    }
    dispatch({ type: "setShowSearch", value: nextShowSearch });
  }, [resetSearchState, state.showSearch]);

  const handleSearchChange = useCallback(
    (value: string) => {
      if (value !== file.searchTerm) {
        hasScrolledToFirstMatch.current = false;
      }
      resetSearchState();
      dispatch({ type: "setSearchInput", value });
    },
    [file.searchTerm, resetSearchState],
  );

  const jumpToMatch = useCallback(
    (direction: "next" | "prev") => {
      if (matchRefs.current.length === 0) return;

      let newMatch: number;
      if (direction === "next") {
        newMatch =
          state.currentMatch >= state.totalMatches ? 1 : state.currentMatch + 1;
      } else {
        newMatch =
          state.currentMatch <= 1 ? state.totalMatches : state.currentMatch - 1;
      }

      const matchElement = matchRefs.current[newMatch - 1];
      if (matchElement) {
        matchElement.scrollIntoView({ behavior: "smooth", block: "center" });
        dispatch({ type: "setCurrentMatch", value: newMatch });
      }
    },
    [state.currentMatch, state.totalMatches],
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
      <PdfViewerControls
        currentMatch={state.currentMatch}
        scale={state.scale}
        searchInput={state.searchInput}
        showSearch={state.showSearch}
        totalMatches={state.totalMatches}
        onSearchChange={handleSearchChange}
        onSearchKeyDown={handleSearchKeyDown}
        onJumpToMatch={jumpToMatch}
        onToggleSearch={toggleSearch}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
      />,
    );
  }, [
    renderControls,
    state.currentMatch,
    state.scale,
    state.searchInput,
    state.showSearch,
    state.totalMatches,
    toggleSearch,
    handleSearchChange,
    handleSearchKeyDown,
    jumpToMatch,
    handleZoomOut,
    handleZoomIn,
  ]);

  const pageNumbers = Array.from({ length: state.numPages }, (_, i) => i + 1);

  if (state.error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-destructive">
        <AlertCircle className="h-8 w-8" />
        <p>Failed to load PDF: {state.error}</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-auto bg-muted/20">
      <Document
        file={file.url}
        onLoadSuccess={({ numPages }) => {
          dispatch({ type: "documentLoaded", numPages });
          hasScrolledToFirstMatch.current = false;
          resetSearchState();
        }}
        onLoadError={(err) => {
          dispatch({ type: "setError", value: err.message });
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
            width={
              state.containerWidth
                ? state.containerWidth * state.scale
                : undefined
            }
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
