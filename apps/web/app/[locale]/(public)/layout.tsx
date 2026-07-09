import { getToken } from "@/modules/auth/server";
import { ConvexClientProvider } from "@/modules/convex/provider";
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
