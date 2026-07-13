import { LandingPage } from "@/features/marketing/landing-page";
import { getViewerState } from "@/features/authentication/server";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { getToken } from "@/lib/auth/server";
import type { Metadata } from "next";

const OG_IMAGE = "https://baseblocks.dev/opengraph-image";

export const metadata: Metadata = {
  title: "BaseBlocks - Idea to site in minutes",
  description:
    "Build, publish, and share internal sites in minutes. BaseBlocks is a collaborative site builder for teams.",
  openGraph: {
    images: [{ url: OG_IMAGE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [OG_IMAGE],
  },
};

export default async function Page() {
  const token = await getToken();
  let authenticatedHref: string | null = null;

  if (token) {
    const { team } = await getViewerState();
    authenticatedHref = team ? getTeamDashboardPath(team.slug) : "/onboarding";
  }

  return <LandingPage authenticatedHref={authenticatedHref} />;
}
