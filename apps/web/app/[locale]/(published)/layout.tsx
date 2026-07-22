import { PublicConvexClientProvider } from "@/lib/convex/provider";
import "@/app/product.css";
import type { ReactNode } from "react";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "@baseblocks/ui/sonner";

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
        "language",
      ])}
    >
      <PublicConvexClientProvider>{children}</PublicConvexClientProvider>
      <Toaster />
    </NextIntlClientProvider>
  );
}
