import { getTeamBillingPlansPath } from "@/features/dashboard/routes";
import { redirect } from "next/navigation";

export default async function LegacyBillingPlansRoute({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  redirect(getTeamBillingPlansPath(teamSlug));
}
