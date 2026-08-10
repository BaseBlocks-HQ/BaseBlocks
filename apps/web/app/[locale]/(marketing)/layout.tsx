import type { PropsWithChildren } from "react";
import { getLocale } from "next-intl/server";
import "@/app/marketing.css";

export default async function MarketingLayout({ children }: PropsWithChildren) {
  const locale = await getLocale();
  return <div data-marketing-locale={locale}>{children}</div>;
}
