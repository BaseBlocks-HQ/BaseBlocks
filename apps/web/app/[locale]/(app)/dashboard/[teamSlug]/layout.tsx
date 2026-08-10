import { getViewerState } from "@/features/authentication/server";
import { TeamAccessProvider } from "@/features/authentication/team-access";
import { AppShell } from "@/features/app-shell/app-shell";
import { analytics, billing } from "@/flags";
import { cookies } from "next/headers";
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

  const [{ team, teams, user }, analyticsEnabled, billingEnabled, cookieStore] =
    await Promise.all([
      getViewerState(teamSlug),
      analytics(),
      billing(),
      cookies(),
    ]);

  if (teams.length === 0) redirect("/onboarding");
  if (!team) notFound();

  return (
    <TeamAccessProvider team={team} teams={teams} user={user}>
      <AppShell
        analyticsEnabled={analyticsEnabled}
        billingEnabled={billingEnabled}
        defaultSidebarOpen={
          cookieStore.get("app_sidebar_state")?.value !== "false"
        }
      >
        {children}
      </AppShell>
    </TeamAccessProvider>
  );
}
