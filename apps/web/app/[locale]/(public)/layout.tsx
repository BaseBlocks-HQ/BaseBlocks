"use client";

import { convex } from "@/lib/convex/client";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
