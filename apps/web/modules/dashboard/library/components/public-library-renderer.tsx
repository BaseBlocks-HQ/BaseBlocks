"use client";

import { usePublicLibraryData } from "@/modules/dashboard/library/data";
import type { LibraryId } from "@/modules/dashboard/library/types";
import { LibraryExplorer } from "./library-explorer";

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
