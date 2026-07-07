"use client";

import { usePublicLibraryData } from "@/modules/document-library/hooks";
import type { LibraryId } from "@/modules/document-library/types";
import { LibraryExplorer } from "@/modules/document-library/components/library-explorer";

export function PublicLibraryRenderer({
  allowDownloads,
  libraryId,
}: {
  allowDownloads: boolean;
  libraryId: string | undefined;
}) {
  const resolvedLibraryId = libraryId ? (libraryId as LibraryId) : null;
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
        allowDownloads,
        embedded: true,
      }}
    />
  );
}
