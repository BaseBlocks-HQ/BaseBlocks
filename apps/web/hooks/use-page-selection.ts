import type { PageListItem } from "@baseblocks/types";
import { useCallback, useState } from "react";

interface UsePageSelectionOptions {
  /** Initial page list to select from */
  pages?: PageListItem[];
  /** Initial selected page ID */
  initialPageId?: string | null;
}

/**
 * Manages page selection state for the editor sidebar
 */
export function usePageSelection(options: UsePageSelectionOptions = {}) {
  const { pages = [], initialPageId = null } = options;
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    initialPageId,
  );

  // Get the currently selected page, or the first page if none selected
  const selectedPage = selectedPageId
    ? pages.find((p) => p._id === selectedPageId)
    : pages[0];

  const selectPage = useCallback((pageId: string | null) => {
    setSelectedPageId(pageId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPageId(null);
  }, []);

  return {
    selectedPageId,
    selectedPage,
    selectPage,
    clearSelection,
  };
}
