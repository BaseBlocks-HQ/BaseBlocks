"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon, File01Icon } from "@hugeicons/core-free-icons";
import { useTeamAccess } from "@/features/authentication/team-access";
import { useSiteNavigation } from "@/features/dashboard/use-site-navigation";
import {
  DashboardPageEmptyState,
  DashboardPage,
  DashboardPageHeader,
  DashboardPageLoadingState,
} from "@/features/dashboard/layout/dashboard-page";
import { getTeamSiteEditorPath } from "@/features/dashboard/routes";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export function DashboardOverview() {
  const t = useTranslations("dashboard");
  const { team, user } = useTeamAccess();
  const sites = useSiteNavigation(team._id);
  const displayName = user?.name?.split(" ")[0] ?? user?.email?.split("@")[0];
  const title = displayName
    ? t("welcomeNamed", { name: displayName })
    : t("welcomeBack");

  if (sites === undefined) {
    return (
      <DashboardPage>
        <DashboardPageHeader title={title} />
        <DashboardPageLoadingState />
      </DashboardPage>
    );
  }

  const recentPages = sites
    .flatMap((site) =>
      site.pages.map((page) => ({
        ...page,
        siteId: site._id,
        siteName: site.name,
      })),
    )
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 6);
  return (
    <DashboardPage>
      <DashboardPageHeader title={title} />

      <section className="flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 text-sm font-semibold">{t("continueWorking")}</h2>
        {recentPages.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {recentPages.map((page) => (
              <Link
                className="group flex min-w-0 items-center gap-3 rounded-xl bg-card px-3.5 py-3 outline-none transition-shadow hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring"
                href={`${getTeamSiteEditorPath(team.slug, page.siteId)}?page=${page._id}`}
                key={page._id}
                prefetch={false}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-base">
                  {page.icon ?? (
                    <HugeiconsIcon
                      className="size-4 text-muted-foreground"
                      icon={File01Icon}
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {page.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {page.siteName}
                  </span>
                </span>
                <HugeiconsIcon
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground/45 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  icon={ArrowUpRight01Icon}
                />
              </Link>
            ))}
          </div>
        ) : (
          <DashboardPageEmptyState message={t("noRecentPages")} />
        )}
      </section>
    </DashboardPage>
  );
}
