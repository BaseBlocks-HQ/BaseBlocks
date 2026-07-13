"use client";

import { useSiteRenderActions } from "@/components/site-runtime/actions";
import { SearchBox } from "@/features/search";
import type { SearchContent } from "@baseblocks/domain";

export const searchDefaults: Required<SearchContent> = {
  placeholder: "Search documents…",
  maxResults: 10,
  showFileType: true,
};

export function readSearch(value: unknown): Required<SearchContent> {
  const candidate =
    value && typeof value === "object" ? (value as SearchContent) : {};
  return {
    placeholder: candidate.placeholder || searchDefaults.placeholder,
    maxResults: Math.min(
      50,
      Math.max(1, candidate.maxResults ?? searchDefaults.maxResults),
    ),
    showFileType: candidate.showFileType ?? searchDefaults.showFileType,
  };
}

export function SearchViewer({ value }: { value: Required<SearchContent> }) {
  const actions = useSiteRenderActions();
  if (!actions.siteId) return null;
  return (
    <SearchBox
      maxResults={value.maxResults}
      onOpenPageResult={(pageId, searchTerm) =>
        actions.openPage?.(pageId, { searchTerm })
      }
      placeholder={value.placeholder}
      showFileType={value.showFileType}
      siteId={actions.siteId}
      surface="soft"
      usePublicQuery={actions.publicSearch === true}
    />
  );
}
