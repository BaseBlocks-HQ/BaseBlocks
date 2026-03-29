import { getAuthenticatedShellContext } from "@/lib/auth-shell/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function UnauthLayout({ children }: PropsWithChildren) {
  const { token } = await getAuthenticatedShellContext();
  if (token) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
