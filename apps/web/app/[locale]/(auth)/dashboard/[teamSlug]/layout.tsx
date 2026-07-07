import { getWorkspaceBoundaryState } from "@/lib/workspace/server";
import { TeamAccessProvider } from "@/modules/workspace/team-access";
import { redirect } from "next/navigation";

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}

export default async function TeamLayout({
  children,
  params,
}: TeamLayoutProps) {
  const { teamSlug } = await params;
  const { requestedWorkspace, teams, user } =
    await getWorkspaceBoundaryState(teamSlug);

  if (teams.length === 0) {
    redirect("/onboarding");
  }

  if (!requestedWorkspace) {
    redirect("/dashboard");
  }

  return (
    <TeamAccessProvider team={requestedWorkspace} teams={teams} user={user}>
      {children}
    </TeamAccessProvider>
  );
}
