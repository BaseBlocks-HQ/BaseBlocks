import { getTeamAccountSettingsPath } from "@/features/dashboard/routes";
import { redirect } from "next/navigation";

export default async function SettingsRoute({
  params,
}: {
  params: Promise<{ teamSlug: string }>;
}) {
  const { teamSlug } = await params;
  redirect(getTeamAccountSettingsPath(teamSlug));
}
