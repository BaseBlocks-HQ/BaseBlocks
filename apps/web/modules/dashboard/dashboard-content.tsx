"use client";

import { useTeamSites } from "@/lib/data/use-site";
import { useTeamAccess } from "@/modules/team/team-access";
import { useConvexAuth } from "convex/react";
import { useTranslations } from "next-intl";
import { CreateSiteDialog } from "./components/create-site-dialog";
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
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.yourSites")}</h1>
          <p className="text-muted-foreground">{t("dashboard.manageSites")}</p>
        </div>
        {capabilities.canManageSites && <CreateSiteDialog teamId={team._id} />}
      </div>

      <SitesGrid
        canManageSites={capabilities.canManageSites}
        sites={sites}
        teamId={team._id}
        teamSlug={team.slug}
      />
    </main>
  );
}
