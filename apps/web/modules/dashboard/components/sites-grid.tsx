"use client";

import type { Id } from "@baseblocks/backend";
import { Card, CardContent } from "@baseblocks/ui/card";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  NestedCard,
  NestedCardPeek,
  NestedCardSurface,
  nestedCardRadiusClass,
} from "@baseblocks/ui/nested-card";
import { Skeleton } from "@baseblocks/ui/skeleton";
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

const sitesGridClassName =
  "grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3";

function SiteCardSkeleton() {
  return (
    <NestedCard className="min-h-[13rem]">
      <NestedCardSurface className="min-h-0 flex-1 px-3 pb-3 pt-4">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-full" />
              <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
            </div>
          </div>
        </div>
      </NestedCardSurface>
      <NestedCardPeek
        className={cn(
          nestedCardRadiusClass,
          "border border-border/55 bg-background/80 p-1 shadow-[inset_0_1px_0_hsl(var(--background)/0.5)] dark:border-border/40 dark:bg-background/46 dark:shadow-[inset_0_1px_0_hsl(var(--background)/0.19)]",
        )}
      >
        <Skeleton className="h-8 min-h-8 flex-1 rounded-[0.9rem] sm:rounded-[1rem]" />
        <Skeleton className="h-8 min-h-8 flex-1 rounded-[0.9rem] sm:rounded-[1rem]" />
      </NestedCardPeek>
    </NestedCard>
  );
}

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
