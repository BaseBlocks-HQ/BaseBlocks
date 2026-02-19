"use client";

import { useEditorContext } from "@/components/editor";
import type { ElementEditorProps } from "@/components/elements/registry";
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
