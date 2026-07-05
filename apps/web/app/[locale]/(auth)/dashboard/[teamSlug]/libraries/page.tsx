"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { LibrariesPageContent } from "@/modules/dashboard/libraries";

export default function TeamLibrariesPage() {
  return (
    <DashboardLayout>
      <LibrariesPageContent />
    </DashboardLayout>
  );
}
