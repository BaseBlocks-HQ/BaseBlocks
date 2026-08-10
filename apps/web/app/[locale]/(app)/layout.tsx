import { getToken } from "@/lib/auth/server";
import "@/app/product.css";
import { ProductThemeProvider } from "@/components/product-theme-provider";
import { ConvexClientProvider } from "@/lib/convex/provider";
import { redirect } from "@/i18n/navigation";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@baseblocks/ui/sonner";
import { getLocale, getMessages } from "next-intl/server";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: PropsWithChildren) {
  if (!(await getToken())) {
    const locale = await getLocale();
    redirect({ href: "/login", locale });
  }

  const messages = await getMessages();
  return (
    <NextIntlClientProvider
      messages={selectMessages(messages, [
        "billing",
        "blocks",
        "common",
        "dashboard",
        "dialogs",
        "editor",
        "elements",
        "errors",
        "guests",
        "inbox",
        "integrations",
        "language",
        "libraries",
        "navigation",
        "onboarding",
        "settings",
        "sites",
        "team",
      ])}
    >
      <ProductThemeProvider>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster />
      </ProductThemeProvider>
    </NextIntlClientProvider>
  );
}
