import { getToken } from "@/modules/auth/server";
import { ConvexClientProvider } from "@/modules/convex/provider";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { ClientAuthBoundary } from "./client-auth-boundary";

export default async function AuthLayout({ children }: PropsWithChildren) {
  const token = await getToken();

  if (!token) {
    redirect("/login");
  }

  return (
    <ConvexClientProvider initialToken={token}>
      <ClientAuthBoundary>{children}</ClientAuthBoundary>
    </ConvexClientProvider>
  );
}
