"use client";

import { useTeamAccess } from "@/features/authentication/team-access";
import { api } from "@baseblocks/backend";
import { Card, CardContent } from "@baseblocks/ui/card";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
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
  isPublished: boolean;
  team?: {
    _id: string;
    name: string;
    slug: string;
  } | null;
}>;

const sitesGridClassName =
  "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

function SitesSection({
  canManageSites,
  sites,
  organizationId,
  teamSlug,
}: {
  canManageSites: boolean;
  sites: SiteList | undefined;
  organizationId: string;
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
      <div className="flex flex-col items-stretch gap-8">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Globe className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-semibold">{t("noSites")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("noSitesDescription")}
            </p>
          </CardContent>
        </Card>
        {canManageSites && (
          <div className={sitesGridClassName}>
            <CreateSiteDialog organizationId={organizationId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={sitesGridClassName}>
      {canManageSites && <CreateSiteDialog organizationId={organizationId} />}
      {sites.map((site) => (
        <SiteCard
          key={site._id}
          canManageSites={canManageSites}
          site={site}
          teamSlug={teamSlug}
        />
      ))}
    </div>
  );
}

export function SitesPage() {
  const t = useTranslations();
  const { capabilities, team } = useTeamAccess();
  const sitesQuery = useQuery(api.sites.listByTeam, {
    organizationId: team.organizationId,
  });

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[64rem]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">{t("dashboard.yourSites")}</h1>
          </div>

          <SitesSection
            canManageSites={capabilities.canManageSites}
            sites={sitesQuery}
            organizationId={team._id}
            teamSlug={team.slug}
          />
        </div>
      </ScrollArea>
    </main>
  );
}
