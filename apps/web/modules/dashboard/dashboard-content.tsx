"use client";

import { useSites, useTeam } from "@/lib/data";
import { useTranslations } from "next-intl";
import { CreateSiteDialog } from "./components/create-site-dialog";
import { SitesGrid } from "./components/sites-grid";

export function DashboardContent() {
  const t = useTranslations();

  const team = useTeam();
  const sites = useSites();

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
