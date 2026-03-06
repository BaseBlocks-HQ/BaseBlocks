import { isAuthenticated } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function UnauthLayout({ children }: PropsWithChildren) {
  if (await isAuthenticated()) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
