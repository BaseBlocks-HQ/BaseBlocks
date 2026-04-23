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
      <SidebarInset className="h-svh overflow-hidden">
        <SidebarTrigger
          className="absolute top-4 left-4 z-50 h-10 w-10 shrink-0 rounded-[1.25rem] border border-border/60 bg-background/90 shadow-md backdrop-blur-sm md:hidden"
          title="Open menu"
        />
        <div className="flex h-svh min-h-0 flex-1 flex-col overflow-hidden max-md:pt-14">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
