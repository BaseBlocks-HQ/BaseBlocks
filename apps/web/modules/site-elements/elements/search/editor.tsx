"use client";

import type { ElementEditorProps } from "@/modules/site-elements/manifest";
import { useEditorSite } from "@/modules/editor/state/editor-context";
import { SearchBox } from "@/modules/site-search";
import type { Id } from "@baseblocks/backend";

export function SearchEditor({ content }: ElementEditorProps<"search">) {
  const { siteId } = useEditorSite();

  return (
    <SearchBox
      siteId={siteId as Id<"sites">}
      placeholder={content.placeholder || "Search documents..."}
      maxResults={content.maxResults || 10}
      showFileType={content.showFileType ?? true}
      usePublicQuery={false}
    />
  );
}
