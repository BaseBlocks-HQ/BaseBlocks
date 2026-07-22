import { getToken } from "@/lib/auth/server";
import "@/app/product.css";
import {
  ProductThemeProvider,
  ThemeProvider,
} from "@/components/theme-provider";
import { ConvexClientProvider } from "@/lib/convex/provider";
import { redirect } from "@/i18n/navigation";
import { selectMessages } from "@/i18n/messages";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@baseblocks/ui/sonner";
import { getMessages } from "next-intl/server";
import type { Metadata } from "next";
import type { PropsWithChildren } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
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
        <ProductThemeProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster />
        </ProductThemeProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
