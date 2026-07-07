"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { LibraryDetailPage } from "@/modules/dashboard/libraries/library-detail-page";
import type { Id } from "@baseblocks/backend";
import { use } from "react";

interface Props {
  params: Promise<{ libraryId: string }>;
}

export default function TeamLibraryDetailPage({ params }: Props) {
  const { libraryId } = use(params);

  return (
    <DashboardLayout>
      <LibraryDetailPage libraryId={libraryId as Id<"documentLibraries">} />
    </DashboardLayout>
  );
}
