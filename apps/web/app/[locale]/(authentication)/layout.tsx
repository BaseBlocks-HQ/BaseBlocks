import { getToken } from "@/lib/auth/server";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { getWorkspaceBoundaryState } from "@/features/authentication/server";
import { redirect } from "next/navigation";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

export default async function UnauthLayout({ children }: PropsWithChildren) {
  const token = await getToken();
  if (token) {
    const { activeWorkspace } = await getWorkspaceBoundaryState();
    redirect(
      activeWorkspace
        ? getTeamDashboardPath(activeWorkspace.slug)
        : "/onboarding",
    );
  }
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={selectMessages(messages, ["auth", "common", "errors"])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
