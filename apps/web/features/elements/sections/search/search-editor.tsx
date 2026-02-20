"use client";

import type { ElementEditorProps } from "@/features/elements/registry";
import { useEditorContext } from "@baseblocks/editor";
import { SearchBox } from "./search-box";

export function SearchEditor({ content }: ElementEditorProps<"search">) {
  const { siteId } = useEditorContext();

  return (
    <SearchBox
      siteId={siteId}
      placeholder={content.placeholder || "Search documents..."}
      maxResults={content.maxResults || 10}
      showFileType={content.showFileType ?? true}
      usePublicQuery={false}
    />
  );
}
