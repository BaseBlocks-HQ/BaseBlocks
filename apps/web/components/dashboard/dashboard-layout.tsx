"use client";

import { DashboardSkeleton } from "@/components/skeletons";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouter } from "@/i18n/navigation";
import { api } from "@repo/backend";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();

  const company = useQuery(api.companies.queries.getMine);

  // Redirect to onboarding if no company
  useEffect(() => {
    if (!authLoading && isAuthenticated && company === null) {
      router.push("/onboarding");
    }
  }, [authLoading, isAuthenticated, company, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading || company === undefined) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated || !company) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <DashboardSidebar companyName={company.name} />
      <SidebarInset>
        <div className="flex flex-col flex-1 min-h-svh">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
