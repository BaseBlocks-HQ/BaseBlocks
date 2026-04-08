import { isAuthenticated } from "@/lib/auth/server";
import { LandingPage } from "@/modules/landing";
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
  const authed = await isAuthenticated();
  return <LandingPage isAuthenticated={authed} />;
}
