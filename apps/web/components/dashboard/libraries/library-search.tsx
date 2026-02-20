"use client";

import { FileIcon, getFileTypeColor } from "@/components/document-library";
import { cn } from "@/lib/utils";
import { api } from "@repo/backend";
import type { Id } from "@repo/backend";
import { Input } from "@repo/ui/input";
import { useQuery } from "convex/react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { useDebounce } from "use-debounce";

interface LibrarySearchProps {
  libraryId: Id<"documentLibraries">;
}

export function LibrarySearch({ libraryId }: LibrarySearchProps) {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 300);

  // Server full-text search
  const serverResults = useQuery(
    api.documents.queries.searchByLibrary,
    debouncedQuery.trim()
      ? { libraryId, query: debouncedQuery, limit: 10 }
      : "skip",
  );

  // Preload all documents in library for client-side fuzzy matching
  const allDocs = useQuery(api.documents.queries.listByLibrary, { libraryId });

  // Merge server results with client-side substring matches on filenames
  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return undefined;
    if (serverResults === undefined) return undefined;

    const serverIds = new Set(serverResults.map((r) => r._id));
    const lower = debouncedQuery.trim().toLowerCase();
    const remaining = 10 - serverResults.length;

    if (remaining <= 0 || !allDocs) return serverResults;

    const fuzzyMatches = allDocs
      .filter(
        (doc) =>
          !serverIds.has(doc._id) && doc.filename.toLowerCase().includes(lower),
      )
      .slice(0, remaining)
      .map((doc) => ({
        _id: doc._id,
        filename: doc.filename,
        contentType: doc.contentType,
        size: doc.size,
        cdnUrl: doc.cdnUrl,
        blobId: doc.blobId,
        libraryId: doc.libraryId,
        matchType: "filename" as const,
        snippet: null,
        snippetMatchStart: null,
        snippetMatchEnd: null,
      }));

    return [...serverResults, ...fuzzyMatches];
  }, [serverResults, allDocs, debouncedQuery]);

  const clearSearch = () => setSearchQuery("");

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("libraries.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {debouncedQuery && searchResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 max-h-80 overflow-auto">
          {searchResults.map(
            (result: {
              _id: string;
              cdnUrl: string | null;
              contentType: string;
              filename: string;
              snippet: string | null;
              matchType: "content" | "filename";
            }) => (
              <a
                key={result._id}
                href={result.cdnUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 hover:bg-accent transition-colors border-b last:border-b-0"
              >
                <div
                  className={cn(
                    "mt-0.5",
                    getFileTypeColor(result.contentType || ""),
                  )}
                >
                  <FileIcon
                    contentType={result.contentType || ""}
                    className="h-4 w-4"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {result.filename}
                  </p>
                  {result.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {result.snippet}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {result.matchType === "content"
                      ? t("libraries.matchInContent")
                      : t("libraries.matchInFilename")}
                  </p>
                </div>
              </a>
            ),
          )}
        </div>
      )}

      {/* No Results */}
      {debouncedQuery && searchResults && searchResults.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md z-50 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t("libraries.noSearchResults")}
          </p>
        </div>
      )}
    </div>
  );
}
