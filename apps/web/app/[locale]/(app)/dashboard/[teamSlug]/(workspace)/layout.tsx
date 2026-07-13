import { DashboardLayout } from "@/features/dashboard/layout/dashboard-layout";
import type { ReactNode } from "react";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
