import { getTeamDashboardPath } from "@/lib/routes/team-routes";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ teamSlug: string }>;
};

export default async function TeamSitesPage({ params }: Props) {
  const { teamSlug } = await params;
  redirect(getTeamDashboardPath(teamSlug));
}
