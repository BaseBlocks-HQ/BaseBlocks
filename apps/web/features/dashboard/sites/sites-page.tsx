"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import {
  DashboardList,
  DashboardPageHeader,
} from "@/features/dashboard/layout/dashboard-page";
import { api } from "@baseblocks/backend";
import { Card, CardContent } from "@baseblocks/ui/card";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateSiteDialog } from "./create-site-dialog";
import { SiteCard } from "./site-card";

type SiteList = Array<{
  _id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  liveReleaseId?: string;
  team?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}>;

function SitesSection({
  canManageSites,
  sites,
  teamSlug,
}: {
  canManageSites: boolean;
  sites: SiteList | undefined;
  teamSlug: string;
}) {
  const t = useTranslations("dashboard");

  if (sites === undefined) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 font-semibold">{t("noSites")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("noSitesDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <DashboardList>
      {sites.map((site) => (
        <SiteCard
          key={site._id}
          canManageSites={canManageSites}
          site={site}
          teamSlug={teamSlug}
        />
      ))}
    </DashboardList>
  );
}

export function SitesPage() {
  const t = useTranslations();
  const { capabilities, team } = useTeamAccess();
  const sitesQuery = useQuery(api.sites.listByTeam, {
    organizationId: team._id,
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-5 sm:px-6">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[64rem]">
          <DashboardPageHeader
            action={
              capabilities.canManageSites ? (
                <CreateSiteDialog organizationId={team._id} />
              ) : null
            }
            title={t("dashboard.yourSites")}
          />

          <SitesSection
            canManageSites={capabilities.canManageSites}
            sites={sitesQuery}
            teamSlug={team.slug}
          />
        </div>
      </div>
    </main>
  );
}
