import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

export default async function MarketingLayout({ children }: PropsWithChildren) {
  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={selectMessages(messages, [
        "common",
        "errors",
        "landing",
        "language",
        "navigation",
      ])}
    >
      {children}
    </NextIntlClientProvider>
  );
}
