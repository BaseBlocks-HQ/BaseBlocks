"use client";

import { DashboardLayout } from "@/modules/dashboard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
