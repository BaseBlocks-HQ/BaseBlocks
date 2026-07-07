"use client";

import type { ElementEditorProps } from "@/modules/editor/elements/framework/registry";
import { useEditorSite } from "@/modules/editor/state";
import type { Id } from "@baseblocks/backend";
import { SearchBox } from "./search-box";

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
