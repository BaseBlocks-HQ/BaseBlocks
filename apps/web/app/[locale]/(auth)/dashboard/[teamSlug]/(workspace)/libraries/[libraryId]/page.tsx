"use client";

import { LibraryDetailContent } from "@/modules/dashboard/libraries";
import type { Id } from "@baseblocks/backend";
import { use } from "react";

interface Props {
  params: Promise<{ libraryId: string }>;
}

export default function TeamLibraryDetailPage({ params }: Props) {
  const { libraryId } = use(params);

  return (
    <LibraryDetailContent libraryId={libraryId as Id<"documentLibraries">} />
  );
}
