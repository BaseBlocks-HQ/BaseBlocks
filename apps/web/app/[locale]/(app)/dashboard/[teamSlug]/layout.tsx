import { DashboardTeamShell } from "@/features/dashboard/layout/dashboard-team-shell";

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}

export default async function TeamLayout({
  children,
  params,
}: TeamLayoutProps) {
  const { teamSlug } = await params;
  return (
    <DashboardTeamShell teamSlug={teamSlug}>{children}</DashboardTeamShell>
  );
}
