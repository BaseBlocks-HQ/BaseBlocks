import "@/app/product.css";
import { ProductThemeProvider } from "@/components/product-theme-provider";
import { selectMessages } from "@/i18n/messages";
import { getToken } from "@/lib/auth/server";
import { ConvexClientProvider } from "@/lib/convex/provider";
import { Toaster } from "@baseblocks/ui/sonner";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { PropsWithChildren } from "react";

export default async function GuestLayout({ children }: PropsWithChildren) {
  const [messages, token] = await Promise.all([getMessages(), getToken()]);
  return (
    <NextIntlClientProvider
      messages={selectMessages(messages, [
        "blocks",
        "common",
        "editor",
        "elements",
        "errors",
        "guests",
        "libraries",
      ])}
    >
      <ProductThemeProvider>
        <ConvexClientProvider initialToken={token}>
          {children}
        </ConvexClientProvider>
        <Toaster />
      </ProductThemeProvider>
    </NextIntlClientProvider>
  );
}
