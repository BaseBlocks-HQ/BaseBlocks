"use client";

import { LibraryPage } from "@/modules/document-library/pages/library-page";
import type { Id } from "@baseblocks/backend";
import { use } from "react";

interface Props {
  params: Promise<{ libraryId: string }>;
}

export default function TeamLibraryPage({ params }: Props) {
  const { libraryId } = use(params);

  return <LibraryPage libraryId={libraryId as Id<"documentLibraries">} />;
}
