import { defaultLocale, locales } from "@baseblocks/i18n";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  defaultLocale,
  localeDetection: false,
  localeCookie: false,
  localePrefix: "as-needed",
  locales,
});
