"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "./use-local-storage";

const STORAGE_KEY = "baseblocks_expanded_pages";

type ExpandedState = Record<string, Set<string>>;
type SerializedState = Record<string, string[]>;

/**
 * Manage expand/collapse state for pages per site
 * Persists to localStorage with SSR safety
 */
export function usePageExpandState(siteId: string) {
  const [serialized, setSerialized] = useLocalStorage<SerializedState>(
    STORAGE_KEY,
    {},
  );

  // Convert serialized arrays to Sets for efficient lookup
  const expandedPages = useMemo(() => {
    const siteState = serialized[siteId];
    return siteState ? new Set(siteState) : new Set<string>();
  }, [serialized, siteId]);

  // Check if a page is expanded
  const isExpanded = useCallback(
    (pageId: string) => {
      return expandedPages.has(pageId);
    },
    [expandedPages],
  );

  // Toggle expand/collapse for a single page
  const toggleExpand = useCallback(
    (pageId: string) => {
      setSerialized((prev) => {
        const currentSiteState = new Set(prev[siteId] || []);

        if (currentSiteState.has(pageId)) {
          currentSiteState.delete(pageId);
        } else {
          currentSiteState.add(pageId);
        }

        return {
          ...prev,
          [siteId]: Array.from(currentSiteState),
        };
      });
    },
    [siteId, setSerialized],
  );

  // Expand all pages in a path (for auto-expanding to current page)
  const expandPath = useCallback(
    (pageIds: string[]) => {
      if (pageIds.length === 0) return;

      setSerialized((prev) => {
        const currentSiteState = new Set(prev[siteId] || []);

        for (const pageId of pageIds) {
          currentSiteState.add(pageId);
        }

        return {
          ...prev,
          [siteId]: Array.from(currentSiteState),
        };
      });
    },
    [siteId, setSerialized],
  );

  // Set a specific page as expanded (without toggle)
  const setExpanded = useCallback(
    (pageId: string, expanded: boolean) => {
      setSerialized((prev) => {
        const currentSiteState = new Set(prev[siteId] || []);

        if (expanded) {
          currentSiteState.add(pageId);
        } else {
          currentSiteState.delete(pageId);
        }

        return {
          ...prev,
          [siteId]: Array.from(currentSiteState),
        };
      });
    },
    [siteId, setSerialized],
  );

  return {
    expandedPages,
    isExpanded,
    toggleExpand,
    expandPath,
    setExpanded,
  };
}
