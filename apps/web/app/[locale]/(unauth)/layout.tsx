import { getToken } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function UnauthLayout({ children }: PropsWithChildren) {
  const token = await getToken();
  if (token) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
