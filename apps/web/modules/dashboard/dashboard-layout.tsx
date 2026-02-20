"use client";

import { DashboardSkeleton } from "@/components/skeletons";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth/client";
import { api } from "@baseblocks/backend";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@baseblocks/ui/sidebar";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  // Detect cross-domain OTT exchange in progress (check URL on client only)
  const [hasOtt, setHasOtt] = useState(false);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.search.includes("ott=")
    ) {
      setHasOtt(true);
    }
  }, []);
  // Clear OTT flag once session is established
  useEffect(() => {
    if (hasOtt && (isAuthenticated || session)) {
      setHasOtt(false);
    }
  }, [hasOtt, isAuthenticated, session]);

  const loading = authLoading || sessionPending || hasOtt;

  const team = useQuery(api.teams.queries.getMine);

  // Redirect to onboarding if no team
  useEffect(() => {
    if (!loading && isAuthenticated && team === null) {
      router.push("/onboarding");
    }
  }, [loading, isAuthenticated, team, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || team === undefined) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || !team) {
    return null;
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
