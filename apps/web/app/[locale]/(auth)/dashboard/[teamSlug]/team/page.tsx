"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { TeamPage } from "@/modules/team/team-page";

export default function TeamMembersPage() {
  return (
    <DashboardLayout>
      <TeamPage />
    </DashboardLayout>
  );
}
