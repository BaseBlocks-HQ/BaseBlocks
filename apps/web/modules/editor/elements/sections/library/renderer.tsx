"use client";

import { LibraryExplorer } from "@/modules/document-library/components/library-explorer";
import { usePublicLibraryData } from "@/modules/document-library/hooks";
import type { LibraryId } from "@/modules/document-library/types";
import type { ElementRendererProps } from "@/modules/editor/elements/framework/registry";

export function LibraryRenderer({ content }: ElementRendererProps<"library">) {
  const resolvedLibraryId = content.libraryId
    ? (content.libraryId as LibraryId)
    : null;
  const data = usePublicLibraryData(resolvedLibraryId);

  if (!resolvedLibraryId) {
    return (
      <div className="rounded-lg border bg-background p-6 text-center text-sm text-muted-foreground">
        No library configured
      </div>
    );
  }

  return (
    <LibraryExplorer
      data={data}
      actions={{}}
      options={{
        access: "read",
        allowDownloads: content.allowDownloads !== false,
        embedded: true,
      }}
    />
  );
}
