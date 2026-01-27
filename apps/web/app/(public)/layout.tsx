"use client";

import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";
import { convex } from "@/lib/convex-provider";

export default function PublicLayout({ children }: { children: ReactNode }) {
  // Plain ConvexProvider without auth - queries execute immediately
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
