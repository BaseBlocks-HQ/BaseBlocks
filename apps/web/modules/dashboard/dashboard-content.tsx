"use client";

import { useTeamSites } from "@/lib/data/use-site";
import { useTeamAccess } from "@/modules/team/team-access";
import { useConvexAuth } from "convex/react";
import { useTranslations } from "next-intl";
import { SitesGrid } from "./components/sites-grid";

interface DashboardContentProps {
  initialSites?: Array<{
    _id: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string;
    isPublished: boolean;
    team?: {
      _id: string;
      name: string;
      slug: string;
    } | null;
  }>;
}

export function DashboardContent({ initialSites }: DashboardContentProps) {
  const t = useTranslations();
  const { capabilities, team } = useTeamAccess();
  const sitesQuery = useTeamSites(team._id);
  const { isLoading: isConvexLoading } = useConvexAuth();
  const sites =
    isConvexLoading || sitesQuery === undefined ? initialSites : sitesQuery;

  return (
    <main className="min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-[64rem]">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{t("dashboard.yourSites")}</h1>
        </div>

        <SitesGrid
          canManageSites={capabilities.canManageSites}
          sites={sites}
          teamId={team._id}
          teamSlug={team.slug}
        />
      </div>
    </main>
  );
}
