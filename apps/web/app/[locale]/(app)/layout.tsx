import { getToken } from "@/lib/auth/server";
import { ConvexClientProvider } from "@/lib/convex/provider";
import { redirect } from "@/i18n/navigation";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

type AppLayoutProps = PropsWithChildren<{
  params: Promise<{ locale: string }>;
}>;

export default async function AppLayout({ children, params }: AppLayoutProps) {
  if (!(await getToken())) {
    const { locale } = await params;
    redirect({ href: "/login", locale });
  }

  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={selectMessages(messages, [
        "blocks",
        "common",
        "dashboard",
        "dialogs",
        "editor",
        "elements",
        "errors",
        "inbox",
        "language",
        "libraries",
        "navigation",
        "onboarding",
        "settings",
        "sites",
        "team",
      ])}
    >
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </NextIntlClientProvider>
  );
}
