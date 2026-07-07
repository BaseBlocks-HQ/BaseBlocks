import { defaultLocale, type Locale } from "./locales";
import { getMessages, messagesByLocale, type AppMessages } from "./messages";

type NestedKeyOf<T extends Record<string, unknown>> = {
  [K in keyof T & string]: T[K] extends string
    ? K
    : T[K] extends Record<string, unknown>
      ? `${K}.${NestedKeyOf<T[K]>}`
      : never;
}[keyof T & string];

export type MessageKey = NestedKeyOf<AppMessages>;

export type TranslationValues = Record<string, string | number>;

function getMessageValue(
  messages: Record<string, unknown>,
  key: string,
): string | null {
  let current: unknown = messages;

  for (const segment of key.split(".")) {
    if (
      !current ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !(segment in current)
    ) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : null;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value == null ? match : String(value);
  });
}

export function translate(
  locale: Locale,
  key: MessageKey,
  values?: TranslationValues,
): string {
  const message =
    getMessageValue(getMessages(locale) as Record<string, unknown>, key) ??
    getMessageValue(
      messagesByLocale[defaultLocale] as Record<string, unknown>,
      key,
    ) ??
    key;

  return interpolate(message, values);
}

export function createTranslator(locale: Locale) {
  return {
    locale,
    t: (key: MessageKey, values?: TranslationValues) =>
      translate(locale, key, values),
  };
}
