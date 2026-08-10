import { getMessages, isLocale } from "@baseblocks/i18n";
import { locale as rootLocale } from "next/root-params";
import { notFound } from "next/navigation";
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = await rootLocale();

  if (!isLocale(locale)) {
    notFound();
  }

  return {
    locale,
    messages: getMessages(locale),
  };
});
