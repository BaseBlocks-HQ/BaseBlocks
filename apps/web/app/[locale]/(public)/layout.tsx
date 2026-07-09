import { PublicConvexClientProvider } from "@/app/_convex/provider";
import type { ReactNode } from "react";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PublicConvexClientProvider>{children}</PublicConvexClientProvider>;
}
