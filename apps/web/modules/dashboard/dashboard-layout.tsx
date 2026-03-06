"use client";

import { DashboardSkeleton } from "@/components/skeletons";
import { redirect } from "@/i18n/navigation";
import { useTeam } from "@/lib/data";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { useConvexAuth } from "convex/react";
import { useLocale } from "next-intl";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const locale = useLocale();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const team = useTeam();

  if (!authLoading && isAuthenticated && team === null) {
    redirect({ href: "/onboarding", locale });
  }

  if (authLoading || !team) {
    return <DashboardSkeleton />;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar teamName={team.name} />
      <SidebarInset>
        <header className="flex md:hidden items-center h-12 px-4 border-b">
          <SidebarTrigger />
        </header>
        <div className="flex flex-col flex-1 min-h-svh">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
