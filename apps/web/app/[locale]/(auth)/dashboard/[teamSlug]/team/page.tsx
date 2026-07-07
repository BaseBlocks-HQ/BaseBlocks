"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { TeamContent } from "@/modules/dashboard/team/team-content";

export default function TeamMembersPage() {
  return (
    <DashboardLayout>
      <TeamContent />
    </DashboardLayout>
  );
}
