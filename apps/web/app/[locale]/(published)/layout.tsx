import {
  ConvexClientProvider,
  PublicConvexClientProvider,
} from "@/lib/convex/provider";
import "@/app/product.css";
import { getToken } from "@/lib/auth/server";
import { parseRequestHost } from "@/lib/routing/hosts";
import type { ReactNode } from "react";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { Toaster } from "@baseblocks/ui/sonner";
import { headers } from "next/headers";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [messages, requestHeaders, token] = await Promise.all([
    getMessages(),
    headers(),
    getToken(),
  ]);
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "";
  const parsedHost = parseRequestHost(host);
  const supportsTeamSession =
    parsedHost.kind === "subdomain" ||
    parsedHost.kind === "localhost-subdomain";
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
      {supportsTeamSession ? (
        <ConvexClientProvider initialToken={token}>
          {children}
        </ConvexClientProvider>
      ) : (
        <PublicConvexClientProvider>{children}</PublicConvexClientProvider>
      )}
      <Toaster />
    </NextIntlClientProvider>
  );
}
