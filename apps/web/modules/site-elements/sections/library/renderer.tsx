"use client";

import { getStoredAccessSessionTokens } from "@/lib/public-site/access-session";
import { LibraryExplorer } from "@/modules/document-library/components/library-explorer";
import type { LibraryId } from "@/modules/document-library/tree-input";
import type { ElementRendererProps } from "@/modules/site-elements/authoring/registry";
import { api } from "@baseblocks/backend";
import { useQuery } from "convex/react";

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  const resolvedLibraryId = content.libraryId
    ? (content.libraryId as LibraryId)
    : null;
  const sessionTokens = getStoredAccessSessionTokens();
  const explorer = useQuery(
    api.documentLibraries.queries.getPublicExplorer,
    resolvedLibraryId
      ? { libraryId: resolvedLibraryId, sessionTokens }
      : "skip",
  );

  if (!resolvedLibraryId) {
    return (
      <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
        No library configured
      </div>
    );
  }

  return (
    <LibraryExplorer
      access="read"
      allowDownloads={content.allowDownloads !== false}
      embedded
      explorer={explorer}
    />
  );
}
