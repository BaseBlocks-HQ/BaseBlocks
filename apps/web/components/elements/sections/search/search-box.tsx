"use client";

import { useMediaViewer } from "@/components/media-viewer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { toProxyDownloadUrl } from "@/lib/storage/client";
import { cn } from "@/lib/utils";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { useQuery } from "convex/react";
import {
  Download,
  Eye,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  Search,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// File type icon mapping
function getFileIcon(contentType: string) {
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

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Highlight text snippet with match
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
  filename: string;
  contentType: string;
  size: number;
  cdnUrl: string;
  blobId?: string;
  libraryId?: string;
  matchType: "content" | "filename";
  snippet?: string | null;
  snippetMatchStart?: number | null;
  snippetMatchEnd?: number | null;
}

interface SearchBoxProps {
  siteId: Id<"sites">;
  placeholder?: string;
  maxResults?: number;
  showFileType?: boolean;
  /** Use public query (for published sites) vs authenticated query (for editor) */
  usePublicQuery?: boolean;
  /** Additional content to render in the input area (e.g., settings button) */
  inputAddon?: React.ReactNode;
  className?: string;
}

export function SearchBox({
  siteId,
  placeholder = "Search documents...",
  maxResults = 10,
  showFileType = true,
  usePublicQuery = false,
  inputAddon,
  className,
}: SearchBoxProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const { openFile } = useMediaViewer();

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

  // Search query
  const shouldSearch = debouncedQuery.trim().length > 0 && !!siteId;

  // Use authenticated query for editor, public query for published sites
  const searchResults = useQuery(
    usePublicQuery
      ? api.documents.queries.searchPublic
      : api.documents.queries.search,
    shouldSearch
      ? {
          siteId,
          query: debouncedQuery,
          limit: maxResults,
        }
      : "skip",
  ) as SearchResultItem[] | undefined;

  const isSearching = shouldSearch && searchResults === undefined;
  const hasResults = searchResults && searchResults.length > 0;
  const showDropdown = isFocused && debouncedQuery.trim().length > 0;

  const handleDownload = useCallback((cdnUrl: string, filename: string) => {
    const link = document.createElement("a");
    link.href = toProxyDownloadUrl(cdnUrl);
    link.download = filename;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handlePreview = useCallback(
    (result: SearchResultItem) => {
      openFile({
        url: toProxyDownloadUrl(result.cdnUrl),
        filename: result.filename,
        contentType: result.contentType,
        size: result.size,
        searchTerm: debouncedQuery,
      });
    },
    [openFile, debouncedQuery],
  );

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Search input */}
      <div className="relative rounded-md transition-all hover:ring-2 hover:ring-muted-foreground/40">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className={cn("pl-10", inputAddon ? "pr-10" : "")}
        />
        {isSearching && (
          <Loader2
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground",
              inputAddon ? "right-10" : "right-3",
            )}
          />
        )}
        {inputAddon}
      </div>

      {/* Floating dropdown results */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : hasResults && searchResults ? (
            <div className="divide-y">
              {searchResults.map((result) => (
                <div
                  key={result._id}
                  className="p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handlePreview(result)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {showFileType && getFileIcon(result.contentType)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate text-sm">
                          {result.filename}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(result.size)}
                          {result.matchType === "content" && (
                            <span className="ml-2 text-primary">
                              • Content match
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePreview(result);
                        }}
                        title="Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(result.cdnUrl, result.filename);
                        }}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {/* Show snippet for content matches */}
                  {result.matchType === "content" && result.snippet && (
                    <div className="mt-2 pl-7">
                      <HighlightedSnippet
                        snippet={result.snippet}
                        matchStart={result.snippetMatchStart ?? -1}
                        matchEnd={result.snippetMatchEnd ?? -1}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No documents found for "{debouncedQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
