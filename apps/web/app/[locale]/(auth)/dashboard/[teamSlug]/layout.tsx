import { api } from "@baseblocks/backend";
import { getToken } from "@/lib/auth/server";
import { getServerConvexClient } from "@/lib/convex/server";
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
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  const client = getServerConvexClient(token);
  const [team, teams] = await Promise.all([
    client.query(api.teams.queries.getBySlugForMember, { slug: teamSlug }),
    client.query(api.teams.queries.listMine, {}),
  ]);

  if (!team) {
    redirect("/dashboard");
  }

  return (
    <TeamAccessProvider
      teamSlug={teamSlug}
      initialTeam={team}
      initialTeams={teams}
    >
      {children}
    </TeamAccessProvider>
  );
}
