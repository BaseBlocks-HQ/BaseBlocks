import { getTeamIntegrationsPath } from "@/features/dashboard/routes";
import { redirect } from "next/navigation";

export default async function LegacyIntegrationsRoute({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  redirect(getTeamIntegrationsPath(teamSlug));
}
