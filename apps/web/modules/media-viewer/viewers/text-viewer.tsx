"use client";

import { cn } from "@/lib/utils";
import { ViewerToolbarIconButton } from "@/modules/media-viewer/components/viewer-toolbar-icon-button";
import { Input } from "@baseblocks/ui/input";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Check, Copy, Search, WrapText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import type { ViewerProps } from "../types";

async function loadTextContent(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }

  return response.text();
}

export function TextViewer({ file, renderControls }: ViewerProps) {
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [searchTerm, setSearchTerm] = useState(file.searchTerm ?? "");
  const [showSearch, setShowSearch] = useState(!!file.searchTerm);
  const firstMatchRef = useRef<HTMLElement | null>(null);
  const hasScrolledToMatch = useRef(false);
  const { data: content, error, isLoading } = useSWR(file.url, loadTextContent);
  const errorMessage =
    error instanceof Error ? error.message : "Failed to load text content";

  const handleCopy = useCallback(async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, [content]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) {
        setSearchTerm("");
      }
      return !prev;
    });
  }, []);

  const toggleWordWrap = useCallback(() => {
    setWordWrap((prev) => !prev);
  }, []);

  useEffect(() => {
    void searchTerm;
    hasScrolledToMatch.current = false;
    firstMatchRef.current = null;
  }, [searchTerm]);

  const highlightedContent = (() => {
    if (!content || !searchTerm.trim()) return content;

    const term = searchTerm.trim();
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = content.split(regex);

    let isFirstMatch = true;
    let matchCount = 0;
    return parts.map((part) => {
      if (regex.test(part)) {
        const isFirst = isFirstMatch;
        isFirstMatch = false;
        const matchId = matchCount;
        matchCount += 1;
        return (
          <mark
            key={`match-${part}-${matchId}`}
            ref={
              isFirst
                ? (el) => {
                    firstMatchRef.current = el;
                  }
                : undefined
            }
            className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
          >
            {part}
          </mark>
        );
      }
      return part;
    });
  })();

  // Scroll to first match when content loads with a search term
  useEffect(() => {
    if (
      firstMatchRef.current &&
      !hasScrolledToMatch.current &&
      file.searchTerm
    ) {
      // Small delay to ensure the content is rendered
      requestAnimationFrame(() => {
        firstMatchRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        hasScrolledToMatch.current = true;
      });
    }
  }, [file.searchTerm]);

  // Register controls with parent
  useEffect(() => {
    if (!renderControls || isLoading || errorMessage) return;

    renderControls(
      <>
        <ViewerToolbarIconButton
          className={cn(showSearch && "bg-primary/10 text-primary")}
          label="Search"
          onClick={toggleSearch}
          pressed={showSearch}
        >
          <Search className="h-4 w-4" />
        </ViewerToolbarIconButton>
        {showSearch && (
          <div className="relative">
            <Input
              type="text"
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 w-32 pr-7 text-xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                aria-label="Clear Search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <ViewerToolbarIconButton
          className={cn(wordWrap && "bg-primary/10 text-primary")}
          label={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          onClick={toggleWordWrap}
          pressed={wordWrap}
        >
          <WrapText className="h-4 w-4" />
        </ViewerToolbarIconButton>
        <ViewerToolbarIconButton
          label="Copy to clipboard"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </ViewerToolbarIconButton>
      </>,
    );
  }, [
    renderControls,
    isLoading,
    errorMessage,
    showSearch,
    searchTerm,
    wordWrap,
    copied,
    toggleSearch,
    toggleWordWrap,
    handleCopy,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Error: {errorMessage}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full min-h-0 bg-muted/20">
      <pre
        className={cn(
          "min-h-full p-4 pt-14 font-mono text-sm",
          wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
      >
        {highlightedContent}
      </pre>
    </ScrollArea>
  );
}
