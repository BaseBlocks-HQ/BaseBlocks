"use client";

import { LibraryDetailContent } from "@/features/dashboard/libraries";
import type { Id } from "@baseblocks/backend";
import { use } from "react";

interface Props {
  params: Promise<{ libraryId: string }>;
}

/**
 * Library detail page - manage folders and files within a library
 */
export default function LibraryDetailPage({ params }: Props) {
  const { libraryId } = use(params);
  return (
    <LibraryDetailContent libraryId={libraryId as Id<"documentLibraries">} />
  );
}
