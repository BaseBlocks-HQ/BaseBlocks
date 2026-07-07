"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { LibrariesPageContent } from "@/modules/dashboard/library";

export default function TeamLibrariesPage() {
  return (
    <DashboardLayout>
      <LibrariesPageContent />
    </DashboardLayout>
  );
}
