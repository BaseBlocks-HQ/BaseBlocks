import { getViewerState } from "@/features/authentication/server";
import { TeamAccessProvider } from "@/features/authentication/team-access";
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

  const { team, teams, user } = await getViewerState(teamSlug);

  if (teams.length === 0) redirect("/onboarding");
  if (!team) notFound();

  return (
    <TeamAccessProvider team={team} teams={teams} user={user}>
      {children}
    </TeamAccessProvider>
  );
}
