"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";
import { TeamContent } from "@/modules/team/team-content";

export default function TeamMembersPage() {
  return (
    <DashboardLayout>
      <TeamContent />
    </DashboardLayout>
  );
}
