"use client";

import { DashboardLayout } from "@/features/dashboard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
