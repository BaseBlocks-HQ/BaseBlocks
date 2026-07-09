import { getToken } from "@/app/_auth/server";
import { ConvexClientProvider } from "@/app/_convex/provider";
import { DashboardTeamShell } from "@/modules/dashboard/layout/dashboard-team-shell";
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

  return (
    <ConvexClientProvider>
      <DashboardTeamShell teamSlug={teamSlug}>{children}</DashboardTeamShell>
    </ConvexClientProvider>
  );
}
