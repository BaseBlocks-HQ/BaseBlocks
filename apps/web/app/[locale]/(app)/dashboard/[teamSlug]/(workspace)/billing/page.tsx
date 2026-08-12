import { getTeamBillingPath } from "@/features/dashboard/routes";
import { redirect } from "next/navigation";

export default async function LegacyBillingRoute({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  redirect(getTeamBillingPath(teamSlug));
}
