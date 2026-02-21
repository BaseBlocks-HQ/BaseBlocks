"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "baseblocks_expanded_pages";

type SerializedState = Record<string, string[]>;

export function usePageExpandState(siteId: string) {
  const [serialized, setSerialized] = useState<SerializedState>({});

  useEffect(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) setSerialized(JSON.parse(item));
    } catch {}
  }, []);

  const sync = (next: SerializedState) => {
    setSerialized(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const expandedPages = serialized[siteId]
    ? new Set(serialized[siteId])
    : new Set<string>();

  const isExpanded = (pageId: string) => expandedPages.has(pageId);

  const toggleExpand = (pageId: string) => {
    const current = new Set(serialized[siteId] || []);
    if (current.has(pageId)) {
      current.delete(pageId);
    } else {
      current.add(pageId);
    }
    sync({ ...serialized, [siteId]: Array.from(current) });
  };

  const expandPath = (pageIds: string[]) => {
    if (pageIds.length === 0) return;
    const current = new Set(serialized[siteId] || []);
    for (const pageId of pageIds) {
      current.add(pageId);
    }
    sync({ ...serialized, [siteId]: Array.from(current) });
  };

  const setExpanded = (pageId: string, expanded: boolean) => {
    const current = new Set(serialized[siteId] || []);
    if (expanded) {
      current.add(pageId);
    } else {
      current.delete(pageId);
    }
    sync({ ...serialized, [siteId]: Array.from(current) });
  };

  return { expandedPages, isExpanded, toggleExpand, expandPath, setExpanded };
}
