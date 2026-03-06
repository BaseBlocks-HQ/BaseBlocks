"use client";

import { DashboardSkeleton } from "@/components/skeletons";
import { useRouter } from "@/i18n/navigation";
import { useTeam } from "@/lib/data";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { useConvexAuth } from "convex/react";
import { useEffect } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const team = useTeam();

  useEffect(() => {
    // Only redirect to onboarding if authenticated but no team.
    // If auth drops (logout), don't redirect — let AuthGuard handle it.
    if (!authLoading && isAuthenticated && team === null) {
      router.replace("/onboarding");
    }
  }, [authLoading, isAuthenticated, team, router]);

  // Show skeleton while auth or team is loading, and also when team is null
  // (authenticated but no team → onboarding redirect is in-flight).
  // Never return null — that causes a blank page flash.
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
