import { PublicConvexClientProvider } from "@/lib/convex/provider";
import type { ReactNode } from "react";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={selectMessages(messages, [
        "common",
        "elements",
        "errors",
        "libraries",
      ])}
    >
      <PublicConvexClientProvider>{children}</PublicConvexClientProvider>
    </NextIntlClientProvider>
  );
}
