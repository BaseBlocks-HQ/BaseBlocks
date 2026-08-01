import { AnalyticsPage } from "@/features/dashboard/analytics/analytics-page";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { analytics } from "@/flags";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ site?: string }>;
};

export default async function TeamAnalyticsPage({
  params,
  searchParams,
}: Props) {
  const [{ teamSlug }, analyticsEnabled] = await Promise.all([
    params,
    analytics(),
  ]);

  if (!analyticsEnabled) redirect(getTeamDashboardPath(teamSlug));

  const { site } = await searchParams;

  return <AnalyticsPage initialSiteId={site} />;
}
