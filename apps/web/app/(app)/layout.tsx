"use client";

import type { ReactNode } from "react";
import { ConvexClientProvider } from "@/lib/convex-provider";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <ConvexClientProvider>{children}</ConvexClientProvider>;
}
