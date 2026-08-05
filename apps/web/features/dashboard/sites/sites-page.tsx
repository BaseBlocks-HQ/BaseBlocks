"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import {
  DashboardList,
  DashboardPage,
  DashboardPageHeader,
  DashboardPageState,
} from "@/features/dashboard/layout/dashboard-page";
import { api } from "@baseblocks/backend";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@baseblocks/ui/empty";
import { Spinner } from "@baseblocks/ui/spinner";
import { useQuery } from "convex/react";
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
      <DashboardPageState>
        <Spinner className="size-6 text-muted-foreground" />
      </DashboardPageState>
    );
  }

  if (sites.length === 0) {
    return (
      <Empty className="min-h-48 rounded-xl bg-card ring-1 ring-foreground/[0.06]">
        <EmptyHeader>
          <EmptyTitle>{t("noSites")}</EmptyTitle>
          <EmptyDescription>{t("noSitesDescription")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
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
    <DashboardPage>
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
    </DashboardPage>
  );
}
