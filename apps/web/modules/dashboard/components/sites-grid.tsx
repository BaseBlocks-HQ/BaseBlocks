"use client";

import { SiteCardSkeleton } from "@/components/skeletons";
import type { Id } from "@baseblocks/backend";
import { Card, CardContent } from "@baseblocks/ui/card";
import { Globe } from "lucide-react";
import { useTranslations } from "next-intl";
import { CreateSiteDialog } from "./create-site-dialog";
import { SiteCard } from "./site-card";

interface SitesGridProps {
  canManageSites: boolean;
  sites:
    | Array<{
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
      }>
    | undefined;
  teamId: Id<"teams">;
  teamSlug: string;
}

const sitesGridClassName = "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3";

export function SitesGrid({
  canManageSites,
  sites,
  teamId,
  teamSlug,
}: SitesGridProps) {
  const t = useTranslations("dashboard");
  const loadingSkeletonIds = canManageSites
    ? ["site-a", "site-b"]
    : ["site-a", "site-b", "site-c"];

  if (sites === undefined) {
    return (
      <div className={sitesGridClassName}>
        {canManageSites && <CreateSiteDialog teamId={teamId} />}
        {loadingSkeletonIds.map((cardId) => (
          <SiteCardSkeleton key={cardId} />
        ))}
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
