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

export function SitesGrid({
  canManageSites,
  sites,
  teamId,
  teamSlug,
}: SitesGridProps) {
  const t = useTranslations("dashboard");
  const loadingCards = ["site-a", "site-b", "site-c"];

  if (sites === undefined) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loadingCards.map((cardId) => (
          <SiteCardSkeleton key={cardId} />
        ))}
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Globe className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">{t("noSites")}</h3>
          <p className="text-muted-foreground text-sm mb-4">
            {t("noSitesDescription")}
          </p>
          {canManageSites && <CreateSiteDialog teamId={teamId} />}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
