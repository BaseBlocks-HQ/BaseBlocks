"use client";

import { DashboardLayout } from "@/components/dashboard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
