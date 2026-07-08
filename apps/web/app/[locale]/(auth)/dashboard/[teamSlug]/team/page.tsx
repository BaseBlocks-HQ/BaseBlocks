"use client";

import { DashboardLayout } from "@/modules/dashboard/layout/dashboard-layout";
import { TeamPage } from "@/modules/dashboard/team/team-page";

export default function TeamMembersPage() {
  return (
    <DashboardLayout>
      <TeamPage />
    </DashboardLayout>
  );
}
