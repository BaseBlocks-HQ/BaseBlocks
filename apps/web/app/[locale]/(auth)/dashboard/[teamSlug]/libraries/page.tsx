"use client";

import { DashboardLayout } from "@/modules/dashboard/layout/dashboard-layout";
import { LibrariesPage } from "@/modules/document-library/pages/libraries-page";

export default function TeamLibrariesPage() {
  return (
    <DashboardLayout>
      <LibrariesPage />
    </DashboardLayout>
  );
}
