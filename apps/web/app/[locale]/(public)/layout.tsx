import { getToken } from "@/app/_auth/server";
import { ConvexClientProvider } from "@/app/_convex/provider";
import type { ReactNode } from "react";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const token = await getToken();

  return (
    <ConvexClientProvider initialToken={token}>{children}</ConvexClientProvider>
  );
}
