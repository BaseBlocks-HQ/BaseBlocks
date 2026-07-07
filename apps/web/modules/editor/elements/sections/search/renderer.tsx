"use client";

import type { ElementRendererProps } from "@/modules/editor/elements/framework/registry";
import { usePublicSiteContextOptional } from "@/modules/marketing/public-site";
import { SearchBox } from "./search-box";

export function SearchRenderer({ content }: ElementRendererProps<"search">) {
  const publicSiteContext = usePublicSiteContextOptional();
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
    />
  );
}
