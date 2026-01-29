"use client";

import { usePublicSiteContextOptional } from "@/components/public";
import type { SearchContent } from "@/types";
import { SearchBox } from "../shared";
import type { BlockRendererBaseProps } from "../types";

export function SearchRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as SearchContent;
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
