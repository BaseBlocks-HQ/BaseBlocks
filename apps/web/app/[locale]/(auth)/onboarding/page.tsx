import { getWorkspaceBoundaryState } from "@/lib/workspace/server";
import { redirect } from "next/navigation";
import { OnboardingPageClient } from "./page-client";

export default async function OnboardingPage() {
  const { activeWorkspace } = await getWorkspaceBoundaryState();

  if (activeWorkspace) {
    redirect("/dashboard");
  }

  return <OnboardingPageClient />;
}
