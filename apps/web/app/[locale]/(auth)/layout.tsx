import { isAuthenticated } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";
import { ClientAuthBoundary } from "./client-auth-boundary";

export default async function AuthLayout({ children }: PropsWithChildren) {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <ClientAuthBoundary>{children}</ClientAuthBoundary>;
}
