"use client";

import { ConvexClientProvider } from "@/lib/convex/provider";
import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
