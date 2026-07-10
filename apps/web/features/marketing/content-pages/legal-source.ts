import type { Locale } from "@baseblocks/i18n";
import { legalEn, legalFr } from "collections/server";
import { loader } from "fumadocs-core/source";

function createLegalSource(
  locale: Locale,
  collection: typeof legalEn | typeof legalFr,
) {
  return loader(collection.toFumadocsSource(), {
    baseUrl: `/${locale}/legal`,
  });
}

const legalCollections = {
  en: legalEn,
  fr: legalFr,
} as const;

const legalSources: Record<Locale, ReturnType<typeof createLegalSource>> = {
  en: createLegalSource("en", legalCollections.en),
  fr: createLegalSource("fr", legalCollections.fr),
};

export function getLegalSource(locale: Locale) {
  return legalSources[locale];
}
