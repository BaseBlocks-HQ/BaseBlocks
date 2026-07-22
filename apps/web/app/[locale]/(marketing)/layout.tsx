import { NextIntlClientProvider } from "next-intl";
import type { PropsWithChildren } from "react";

type Props = PropsWithChildren<{ params: Promise<{ locale: string }> }>;

export default async function MarketingLayout({ children, params }: Props) {
  const { locale } = await params;
  return (
    <NextIntlClientProvider locale={locale} messages={{}} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}
