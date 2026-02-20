"use client";

import { api } from "@baseblocks/backend";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { CreateSiteDialog } from "./components/create-site-dialog";
import { SitesGrid } from "./components/sites-grid";

export function DashboardContent() {
  const t = useTranslations();

  const team = useQuery(api.teams.queries.getMine);
  const sites = useQuery(api.sites.queries.list);

  // The layout handles auth and loading states
  // team can be null for users who only have membership in other orgs
  return (
    <main className="flex-1 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard.yourSites")}</h1>
          <p className="text-muted-foreground">{t("dashboard.manageSites")}</p>
        </div>
        <CreateSiteDialog />
      </div>

      <SitesGrid sites={sites} teamSlug={team?.slug} />
    </main>
  );
}
