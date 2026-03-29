"use client";

import { DashboardLayout } from "@/modules/dashboard/dashboard-layout";

export default function TeamWorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
