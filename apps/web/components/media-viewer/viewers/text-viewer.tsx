"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Copy, Check, WrapText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ViewerProps } from "../types";

export function TextViewer({ file }: ViewerProps) {
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

  // Highlight search terms in content
  const highlightedContent = useMemo(() => {
    if (!content || !searchTerm.trim()) return content;

    const term = searchTerm.trim();
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = content.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }, [content, searchTerm]);

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
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSearch(!showSearch)}
          title="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        {showSearch && (
          <Input
            type="text"
            placeholder="Search in file..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48 h-8"
          />
        )}
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setWordWrap(!wordWrap)}
          title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
          className={cn(wordWrap && "bg-muted")}
        >
          <WrapText className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <pre
          className={cn(
            "p-4 text-sm font-mono",
            wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre"
          )}
        >
          {highlightedContent}
        </pre>
      </ScrollArea>
    </div>
  );
}
