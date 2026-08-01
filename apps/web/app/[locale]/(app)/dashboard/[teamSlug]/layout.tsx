import { getViewerState } from "@/features/authentication/server";
import { TeamAccessProvider } from "@/features/authentication/team-access";
import { AppShell } from "@/features/app-shell/app-shell";
import { analytics } from "@/flags";
import { notFound, redirect } from "next/navigation";

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}

export default async function TeamLayout({
  children,
  params,
}: TeamLayoutProps) {
  const { teamSlug } = await params;

  const [{ team, teams, user }, analyticsEnabled] = await Promise.all([
    getViewerState(teamSlug),
    analytics(),
  ]);

  if (teams.length === 0) redirect("/onboarding");
  if (!team) notFound();

  return (
    <TeamAccessProvider team={team} teams={teams} user={user}>
      <AppShell analyticsEnabled={analyticsEnabled}>{children}</AppShell>
    </TeamAccessProvider>
  );
}
