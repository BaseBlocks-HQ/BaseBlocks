import { getTeamMembersPath } from "@/features/dashboard/routes";
import { redirect } from "next/navigation";

export default async function LegacyTeamRoute({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  redirect(getTeamMembersPath(teamSlug));
}
