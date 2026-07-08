"use client";

import { useTeamSites } from "@/lib/data/use-site";
import { useTeamAccess } from "@/modules/workspace/team-access";
import type { Id } from "@baseblocks/backend";
import { Card, CardContent } from "@baseblocks/ui/card";
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { Spinner } from "@baseblocks/ui/spinner";
import { useConvexAuth } from "convex/react";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateSiteDialog } from "./create-site-dialog";
import { SiteCard } from "./site-card";

interface SitesPageProps {
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

const sitesGridClassName =
  "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

function SitesSection({
  canManageSites,
  sites,
  teamId,
  teamSlug,
}: {
  canManageSites: boolean;
  sites: SitesPageProps["initialSites"];
  teamId: Id<"teams">;
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
            <CreateSiteDialog teamId={teamId} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={sitesGridClassName}>
      {canManageSites && <CreateSiteDialog teamId={teamId} />}
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

export function SitesPage({ initialSites }: SitesPageProps) {
  const t = useTranslations();
  const { capabilities, team } = useTeamAccess();
  const sitesQuery = useTeamSites(team._id);
  const { isLoading: isConvexLoading } = useConvexAuth();
  const sites =
    isConvexLoading || sitesQuery === undefined ? initialSites : sitesQuery;

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6">
      <ScrollArea className="min-h-0 flex-1">
        <div className="mx-auto w-full max-w-[64rem]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold">{t("dashboard.yourSites")}</h1>
          </div>

          <SitesSection
            canManageSites={capabilities.canManageSites}
            sites={sites}
            teamId={team._id}
            teamSlug={team.slug}
          />
        </div>
      </ScrollArea>
    </main>
  );
}
