"use client";

import type { ElementRendererProps } from "@/modules/site-elements/authoring/registry";
import { SearchBox } from "@/modules/site-search";
import { useSiteRenderActions } from "@/modules/site-runtime/actions";

export function SearchRenderer({ content }: ElementRendererProps<"search">) {
  const actions = useSiteRenderActions();
  const siteId = actions.siteId;

  if (!siteId) {
    return (
      <div className="text-muted-foreground text-sm">
        Search is not available (no site context)
      </div>
    );
  }

  return (
    <SearchBox
      siteId={siteId}
      placeholder={content.placeholder || "Search documents..."}
      maxResults={content.maxResults || 10}
      showFileType={content.showFileType !== false}
      usePublicQuery={actions.publicSearch === true}
      onOpenPageResult={(pageId, searchTerm) =>
        actions.openPage?.(pageId, { searchTerm })
      }
    />
  );
}
