"use client";

import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  FilePreview,
  type PreviewFile,
} from "@/components/file-viewer/file-viewer";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { useDebounce } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useQuery } from "convex/react";
import {
  ChevronRight,
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  NotebookText,
  Presentation,
  Search,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

function getFileIcon(contentType: string | undefined) {
  if (!contentType) return <File className="h-4 w-4 text-gray-500" />;
  if (contentType.includes("pdf")) {
    return <FileText className="h-4 w-4 text-red-500" />;
  }
  if (contentType.includes("spreadsheet") || contentType.includes("excel")) {
    return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  }
  if (
    contentType.includes("presentation") ||
    contentType.includes("powerpoint")
  ) {
    return <Presentation className="h-4 w-4 text-orange-500" />;
  }
  if (contentType.includes("word") || contentType.includes("document")) {
    return <FileText className="h-4 w-4 text-blue-500" />;
  }
  if (contentType.includes("image")) {
    return <FileImage className="h-4 w-4 text-purple-500" />;
  }
  return <File className="h-4 w-4 text-gray-500" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function HighlightedSnippet({
  snippet,
  matchStart,
  matchEnd,
}: {
  snippet: string;
  matchStart: number;
  matchEnd: number;
}) {
  if (matchStart < 0 || matchEnd < 0 || matchStart >= matchEnd) {
    return <span className="text-muted-foreground">{snippet}</span>;
  }

  const before = snippet.slice(0, matchStart);
  const match = snippet.slice(matchStart, matchEnd);
  const after = snippet.slice(matchEnd);

  return (
    <span className="text-muted-foreground text-xs leading-relaxed">
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800 text-foreground px-0.5 rounded">
        {match}
      </mark>
      {after}
    </span>
  );
}

interface SearchResultItem {
  _id: string;
  contentType: "document" | "page";
  sourceId: string;
  title: string;
  matchType: "title" | "content";
  snippet: string | null;
  snippetMatchStart: number | null;
  snippetMatchEnd: number | null;
  metadata: {
    // Document metadata
    filename?: string;
    fileContentType?: string;
    size?: number;
    downloadUrl?: string;
    libraryId?: string;
    // Page metadata
    pageId?: string;
  };
}

interface SearchBoxProps {
  siteId: Id<"sites">;
  placeholder?: string;
  maxResults?: number;
  showFileType?: boolean;
  /** Use public query (for published sites) vs authenticated query (for editor) */
  usePublicQuery?: boolean;
  /** Additional content to render in the input area (e.g., settings button) */
  inputAddon?: ReactNode;
  onOpenPageResult?: (pageId: string, searchTerm: string) => void;
  /** Adapt colors to blend with a custom-colored header */
  headerMode?: boolean;
  className?: string;
}

export function SearchBox({
  siteId,
  placeholder = "Search...",
  maxResults = 10,
  showFileType = true,
  usePublicQuery = false,
  inputAddon,
  onOpenPageResult,
  headerMode = false,
  className,
}: SearchBoxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const sessionTokens = getStoredAccessSessionTokens();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const shouldSearch = debouncedQuery.trim().length > 0 && !!siteId;

  // Server full-text search queries
  const authResults = useQuery(
    api.search.searchAll,
    !usePublicQuery && shouldSearch
      ? { siteId, query: debouncedQuery, limit: maxResults }
      : "skip",
  ) as SearchResultItem[] | undefined;

  const publicResults = useQuery(
    api.search.searchAllPublic,
    usePublicQuery && shouldSearch
      ? {
          siteId,
          query: debouncedQuery,
          limit: maxResults,
          sessionTokens,
        }
      : "skip",
  ) as SearchResultItem[] | undefined;

  const serverResults = usePublicQuery ? publicResults : authResults;

  const searchResults = shouldSearch ? serverResults : undefined;

  const isSearching = shouldSearch && searchResults === undefined;
  const hasResults = searchResults && searchResults.length > 0;
  const showDropdown = isFocused && debouncedQuery.trim().length > 0;

  const handleDownload = (downloadUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResultClick = (result: SearchResultItem) => {
    if (result.contentType === "page" && result.metadata.pageId) {
      onOpenPageResult?.(result.metadata.pageId, debouncedQuery);
      setIsFocused(false);
      return;
    }

    if (result.metadata.downloadUrl) {
      setPreviewFile({
        url: result.metadata.downloadUrl,
        filename: result.metadata.filename || result.title,
        contentType:
          result.metadata.fileContentType || "application/octet-stream",
        size: result.metadata.size || 0,
        searchTerm: debouncedQuery,
      });
    }
    setIsFocused(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search input */}
      <div
        className={cn(
          "relative rounded-md transition-all",
          headerMode
            ? "hover:ring-2 hover:ring-current/20"
            : "hover:ring-2 hover:ring-muted-foreground/40",
        )}
      >
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
            headerMode ? "text-current opacity-50" : "text-muted-foreground",
          )}
        />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className={cn(
            "pl-10",
            inputAddon ? "pr-10" : "",
            headerMode &&
              "border-current/20 bg-current/[0.08] text-current placeholder:text-current/50 dark:bg-current/[0.08] focus-visible:ring-current/25 focus-visible:border-current/30",
          )}
        />
        {isSearching && (
          <Loader2
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 animate-spin",
              headerMode ? "text-current opacity-50" : "text-muted-foreground",
              inputAddon ? "right-10" : "right-3",
            )}
          />
        )}
        {inputAddon}
      </div>

      {/* Floating dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-background text-foreground shadow-lg">
          <ScrollArea className="max-h-[400px]">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                Searching...
              </div>
            ) : hasResults && searchResults ? (
              <div className="divide-y">
                {searchResults.map((result) => {
                  const isPage = result.contentType === "page";
                  const isContentMatch = result.matchType === "content";

                  return (
                    <button
                      type="button"
                      key={result._id}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {showFileType &&
                            (isPage ? (
                              <NotebookText className="h-4 w-4 text-indigo-500" />
                            ) : (
                              getFileIcon(result.metadata.fileContentType)
                            ))}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-sm text-foreground">
                              {result.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {isPage ? (
                                <span className="text-indigo-600 dark:text-indigo-400">
                                  Page
                                </span>
                              ) : (
                                result.metadata.size &&
                                formatFileSize(result.metadata.size)
                              )}
                              {isContentMatch && (
                                <span className="ml-2 text-primary">
                                  • Content match
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        {isPage ? (
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResultClick(result);
                              }}
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {result.metadata.downloadUrl && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    result.metadata.downloadUrl!,
                                    result.metadata.filename || result.title,
                                  );
                                }}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Show snippet for content matches */}
                      {isContentMatch && result.snippet && (
                        <div className="mt-2 pl-7">
                          <HighlightedSnippet
                            snippet={result.snippet}
                            matchStart={result.snippetMatchStart ?? -1}
                            matchEnd={result.snippetMatchEnd ?? -1}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground text-sm">
                No results found for "{debouncedQuery}"
              </div>
            )}
          </ScrollArea>
        </div>
      )}
      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
