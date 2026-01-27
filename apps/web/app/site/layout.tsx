"use client";

import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "@/lib/convex-provider";

export default function PublicSiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Use plain ConvexProvider without auth for public site pages
  // This allows queries to execute immediately without waiting for authentication
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
