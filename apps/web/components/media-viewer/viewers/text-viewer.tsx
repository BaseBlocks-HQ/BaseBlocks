"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Check, Copy, Search, WrapText, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ViewerProps } from "../types";

export function TextViewer({ file, renderControls }: ViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [wordWrap, setWordWrap] = useState(true);
  const [searchTerm, setSearchTerm] = useState(file.searchTerm ?? "");
  const [showSearch, setShowSearch] = useState(!!file.searchTerm);

  // Fetch text content
  useEffect(() => {
    setIsLoading(true);
    setError(null);

    fetch(file.url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
        return res.text();
      })
      .then((text) => {
        setContent(text);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [file.url]);

  const handleCopy = useCallback(async () => {
    if (!content) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [content]);

  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
    if (showSearch) {
      setSearchTerm("");
    }
  }, [showSearch]);

  const toggleWordWrap = useCallback(() => {
    setWordWrap((prev) => !prev);
  }, []);

  // Highlight search terms in content
  const highlightedContent = useMemo(() => {
    if (!content || !searchTerm.trim()) return content;

    const term = searchTerm.trim();
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = content.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark
          key={i}
          className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }, [content, searchTerm]);

  // Register controls with parent
  useEffect(() => {
    if (!renderControls || isLoading || error) return;

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
          <div className="relative">
            <Input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 w-32 text-xs pr-6"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7", wordWrap && "bg-muted")}
          onClick={toggleWordWrap}
          title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
        >
          <WrapText className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </>
    );
  }, [renderControls, isLoading, error, showSearch, searchTerm, wordWrap, copied, toggleSearch, toggleWordWrap, handleCopy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive">
        Error: {error}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <pre
        className={cn(
          "p-4 text-sm font-mono",
          wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
        )}
      >
        {highlightedContent}
      </pre>
    </ScrollArea>
  );
}
