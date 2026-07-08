"use client";

import type { ElementRendererProps } from "@/modules/site-elements/authoring/registry";
import { SearchBox } from "@/modules/site-search";
import { usePublicPagePanelOptional } from "@/modules/public-site/public-page-panel-context";
import { usePublicSiteContextOptional } from "@/modules/public-site/public-site-context";

export function SearchRenderer({ content }: ElementRendererProps<"search">) {
  const publicSiteContext = usePublicSiteContextOptional();
  const pagePanel = usePublicPagePanelOptional();
  const siteId = publicSiteContext?.siteId;

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
      usePublicQuery={true}
      onOpenPageResult={(pageId, searchTerm) =>
        pagePanel?.openPage(pageId, { searchTerm })
      }
    />
  );
}
