"use client";

import type { ElementEditorProps } from "@/modules/elements/framework/registry";
import { useEditorContext } from "@/modules/shared/contexts/editor-context";
import type { Id } from "@baseblocks/backend";
import { SearchBox } from "./search-box";

export function SearchEditor({ content }: ElementEditorProps<"search">) {
  const { siteId } = useEditorContext();

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
