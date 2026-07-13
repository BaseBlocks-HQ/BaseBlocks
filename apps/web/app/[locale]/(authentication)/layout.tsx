import { getToken } from "@/lib/auth/server";
import { getTeamDashboardPath } from "@/features/dashboard/routes";
import { getViewerState } from "@/features/authentication/server";
import { redirect } from "next/navigation";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

export default async function UnauthLayout({ children }: PropsWithChildren) {
  const token = await getToken();
  if (token) {
    const { team } = await getViewerState();
    redirect(
      team ? getTeamDashboardPath(team.slug) : "/onboarding",
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
