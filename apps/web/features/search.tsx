"use client";

import { getStoredAccessSessionTokens } from "@/features/published-sites/access-session";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  FilePreview,
  type PreviewFile,
} from "@/components/file-viewer/file-viewer";
import { FileIcon, formatFileSize } from "@/components/file-viewer/file-ui";
import { api } from "@baseblocks/backend";
import type { Id } from "@baseblocks/backend";
import { Button } from "@baseblocks/ui/button";
import { useDebounce } from "@baseblocks/ui/hooks/use-debounce";
import { Input } from "@baseblocks/ui/input";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import {
  ChevronRight,
  Download,
  Eye,
  Loader2,
  NotebookText,
  Search,
} from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

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

type SearchResultItem = FunctionReturnType<typeof api.search.searchAll>[number];
type DocumentSearchMetadata = Extract<
  SearchResultItem["metadata"],
  { downloadUrl: string }
>;

function getDocumentMetadata(
  result: SearchResultItem,
): DocumentSearchMetadata | null {
  return "downloadUrl" in result.metadata ? result.metadata : null;
}

function getPageId(result: SearchResultItem) {
  return "pageId" in result.metadata ? result.metadata.pageId : undefined;
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
  onOpenPageResult?: (pageId: string) => void;
  surface?: "default" | "soft";
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
  surface = "default",
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
  );

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
  );

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
    const pageId = getPageId(result);
    if (result.contentType === "page" && pageId) {
      onOpenPageResult?.(pageId);
      setIsFocused(false);
      return;
    }

    const metadata = getDocumentMetadata(result);
    if (metadata) {
      setPreviewFile({
        url: metadata.downloadUrl,
        filename: metadata.filename || result.title,
        contentType: metadata.fileContentType || "application/octet-stream",
        size: metadata.size || 0,
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
          surface === "soft"
            ? "rounded-2xl"
            : "hover:ring-2 hover:ring-muted-foreground/40",
        )}
      >
        <Search
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none",
            "text-muted-foreground",
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
            surface === "soft" &&
              "rounded-2xl border-0 bg-card shadow-none dark:bg-card",
          )}
        />
        {isSearching && (
          <Loader2
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 animate-spin",
              "text-muted-foreground",
              inputAddon ? "right-10" : "right-3",
            )}
          />
        )}
        {inputAddon}
      </div>

      {/* Floating dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-background text-foreground shadow-lg">
          <div className="max-h-[400px] overflow-y-auto">
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
                  const documentMetadata = getDocumentMetadata(result);

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
                              <FileIcon
                                contentType={
                                  documentMetadata?.fileContentType ??
                                  "application/octet-stream"
                                }
                              />
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
                                documentMetadata?.size &&
                                formatFileSize(documentMetadata.size)
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
                            {documentMetadata && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownload(
                                    documentMetadata.downloadUrl,
                                    documentMetadata.filename || result.title,
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
          </div>
        </div>
      )}
      <FilePreview file={previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  );
}
