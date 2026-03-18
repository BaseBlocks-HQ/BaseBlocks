import { routing } from "@/i18n/routing";
import { docs } from "collections/server";
import { defineI18n } from "fumadocs-core/i18n";
import { loader } from "fumadocs-core/source";

export const docsI18n = defineI18n({
  languages: [...routing.locales],
  defaultLanguage: routing.defaultLocale,
  hideLocale: "default-locale",
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
  i18n: docsI18n,
});
