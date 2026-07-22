import { ThemeProvider } from "@/components/theme-provider";
import type { PropsWithChildren } from "react";
import "@/app/marketing.css";

type Props = PropsWithChildren<{ params: Promise<{ locale: string }> }>;

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <div data-marketing-locale={locale}>{children}</div>
    </ThemeProvider>
  );
}
