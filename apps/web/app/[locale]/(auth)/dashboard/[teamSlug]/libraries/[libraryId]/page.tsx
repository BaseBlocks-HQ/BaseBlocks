"use client";

import { DashboardLayout } from "@/modules/dashboard/layout/dashboard-layout";
import { LibraryPage } from "@/modules/document-library/pages/library-page";
import type { Id } from "@baseblocks/backend";
import { use } from "react";

interface Props {
  params: Promise<{ libraryId: string }>;
}

export default function TeamLibraryPage({ params }: Props) {
  const { libraryId } = use(params);

  return (
    <DashboardLayout>
      <LibraryPage libraryId={libraryId as Id<"documentLibraries">} />
    </DashboardLayout>
  );
}
