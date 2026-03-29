"use client";

import { TeamAccessProvider } from "@/modules/team/team-access";
import { use } from "react";

interface TeamLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamSlug: string }>;
}

export default function TeamLayout({ children, params }: TeamLayoutProps) {
  const { teamSlug } = use(params);

  return (
    <TeamAccessProvider teamSlug={teamSlug}>{children}</TeamAccessProvider>
  );
}
