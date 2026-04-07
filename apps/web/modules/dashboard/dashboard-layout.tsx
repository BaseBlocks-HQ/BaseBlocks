"use client";

import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import dynamic from "next/dynamic";

const DashboardSidebar = dynamic(
  () =>
    import("./dashboard-sidebar").then((m) => ({
      default: m.DashboardSidebar,
    })),
  { ssr: false },
);

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar />
      <SidebarInset>
        <header className="flex md:hidden items-center h-12 px-4 border-b">
          <SidebarTrigger />
        </header>
        <div className="flex flex-col flex-1 min-h-svh">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
