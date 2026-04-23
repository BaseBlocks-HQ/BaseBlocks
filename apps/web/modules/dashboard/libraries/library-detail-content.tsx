"use client";

import { DashboardLibraryDetail } from "@/modules/library";
import type { Id } from "@baseblocks/backend";

export function LibraryDetailContent({
  libraryId,
}: {
  libraryId: Id<"documentLibraries">;
}) {
  return <DashboardLibraryDetail libraryId={libraryId} />;
}
