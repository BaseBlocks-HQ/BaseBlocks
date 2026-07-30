"use client";

import { SidebarInset, SidebarProvider } from "@baseblocks/ui/sidebar";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider className="brand-interface" defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <div className="flex h-svh min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
