"use client";

import { DashboardSkeleton } from "@/components/skeletons";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useRouter } from "@/i18n/navigation";
import { authClient } from "@/lib/auth-client";
import { api } from "@repo/backend";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardSidebar } from "./dashboard-sidebar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [migrationAttempted, setMigrationAttempted] = useState(false);
  const [migrationUpdatedRecords, setMigrationUpdatedRecords] = useState(false);
  const migrationRef = useRef(false);

  // Detect cross-domain OTT exchange in progress (check URL on client only)
  const [hasOtt, setHasOtt] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("ott=")) {
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

  const company = useQuery(api.companies.queries.getMine);
  const migrateAfterLogin = useMutation(api.members.mutations.migrateAfterLogin);
  const linkOrganization = useMutation(api.companies.mutations.linkOrganization);

  // Create BA organizations for legacy companies and link them
  const migrateCompanyOrgs = useCallback(
    async (companies: { _id: string; name: string; slug: string }[]) => {
      for (const co of companies) {
        try {
          const orgResult = await authClient.organization.create({
            name: co.name,
            slug: co.slug,
          });
          if (orgResult.data?.id) {
            await linkOrganization({
              companyId: co._id as any,
              organizationId: orgResult.data.id,
            });
          }
        } catch {
          // Slug conflict - try with a suffix
          try {
            const orgResult = await authClient.organization.create({
              name: co.name,
              slug: `${co.slug}-${Date.now().toString(36).slice(-4)}`,
            });
            if (orgResult.data?.id) {
              await linkOrganization({
                companyId: co._id as any,
                organizationId: orgResult.data.id,
              });
            }
          } catch {
            // Skip this company, it will be retried on next login
          }
        }
      }
    },
    [linkOrganization],
  );

  // Try migration when authenticated but no company found
  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      company === null &&
      !migrationAttempted &&
      !migrationRef.current
    ) {
      migrationRef.current = true;
      migrateAfterLogin({})
        .then(async (result) => {
          // Create BA orgs for legacy companies
          if (result.unmigratedCompanies.length > 0) {
            await migrateCompanyOrgs(result.unmigratedCompanies);
          }
          setMigrationUpdatedRecords(
            result.updated > 0 || result.unmigratedCompanies.length > 0,
          );
          setMigrationAttempted(true);
        })
        .catch(() => setMigrationAttempted(true));
    }
  }, [loading, isAuthenticated, company, migrationAttempted, migrateAfterLogin, migrateCompanyOrgs]);

  // Also migrate company orgs for users who already have member records
  // (migrateAfterLogin short-circuits member linking but still returns unmigratedCompanies)
  const orgMigrationRef = useRef(false);
  useEffect(() => {
    if (
      !loading &&
      isAuthenticated &&
      company &&
      !company.organizationId &&
      !orgMigrationRef.current
    ) {
      orgMigrationRef.current = true;
      migrateAfterLogin({})
        .then(async (result) => {
          if (result.unmigratedCompanies.length > 0) {
            await migrateCompanyOrgs(result.unmigratedCompanies);
          }
        })
        .catch(() => {});
    }
  }, [loading, isAuthenticated, company, migrateAfterLogin, migrateCompanyOrgs]);

  // Redirect to onboarding if no company after migration attempt
  // If migration updated records, wait for the reactive query to deliver the company
  useEffect(() => {
    if (!loading && isAuthenticated && company === null && migrationAttempted) {
      if (migrationUpdatedRecords) {
        // Migration linked member records - wait for getMine to reactively update
        const timer = setTimeout(() => {
          router.push("/onboarding");
        }, 3000);
        return () => clearTimeout(timer);
      }
      router.push("/onboarding");
    }
  }, [loading, isAuthenticated, company, migrationAttempted, migrationUpdatedRecords, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || company === undefined || (!company && !migrationAttempted) || (!company && migrationUpdatedRecords)) {
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
