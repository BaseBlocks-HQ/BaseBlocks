import { getTeamAnalyticsPath } from "@/features/dashboard/routes";
import { redirect } from "next/navigation";

export default async function LegacyAnalyticsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ teamSlug: string }>;
  searchParams: Promise<{ site?: string }>;
}) {
  const [{ teamSlug }, { site }] = await Promise.all([params, searchParams]);
  const suffix = site ? `?site=${encodeURIComponent(site)}` : "";
  redirect(`${getTeamAnalyticsPath(teamSlug)}${suffix}`);
}
