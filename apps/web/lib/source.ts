import { routing } from "@/i18n/routing";
import { docs } from "collections/server";
import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";
import { defineI18nUI } from "fumadocs-ui/i18n";
import { icons } from "lucide-react";
import { createElement } from "react";

export const docsI18n = defineI18n({
  languages: [...routing.locales],
  defaultLanguage: routing.defaultLocale,
  hideLocale: "default-locale",
});

export const { provider: docsI18nProvider } = defineI18nUI(docsI18n, {
  translations: {
    en: { displayName: "English" },
    fr: { displayName: "Français" },
  },
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
  icon(icon) {
    if (!icon) return;
    if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
  },
});
