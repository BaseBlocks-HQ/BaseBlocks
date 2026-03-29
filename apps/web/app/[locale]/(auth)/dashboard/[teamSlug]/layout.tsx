import { getWorkspaceBoundaryState } from "@/lib/workspace/server";
import { TeamAccessProvider } from "@/modules/team/team-access";
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
  const { activeWorkspace, requestedWorkspace, teams } =
    await getWorkspaceBoundaryState(teamSlug);

  if (teams.length === 0) {
    redirect("/onboarding");
  }

  if (!requestedWorkspace) {
    redirect("/dashboard");
  }

  return (
    <TeamAccessProvider
      workspace={{
        team: requestedWorkspace,
        teams,
      }}
    >
      {children}
    </TeamAccessProvider>
  );
}
