import { isAuthenticated } from "@/lib/auth/server";
import { LandingPage } from "@/modules/landing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BaseBlocks - Idea to site in minutes",
  description:
    "Build, publish, and share internal sites in minutes. BaseBlocks is a collaborative site builder for teams.",
};

export default async function Page() {
  const authed = await isAuthenticated();
  return <LandingPage isAuthenticated={authed} />;
}
