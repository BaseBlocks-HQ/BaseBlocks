"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { LibraryDetailContent } from "@/modules/dashboard/libraries";
import type { Id } from "@baseblocks/backend";
import { use } from "react";

interface Props {
  params: Promise<{ libraryId: string }>;
}

export default function TeamLibraryDetailPage({ params }: Props) {
  const { libraryId } = use(params);

  return (
    <DashboardLayout>
      <LibraryDetailContent libraryId={libraryId as Id<"documentLibraries">} />
    </DashboardLayout>
  );
}
