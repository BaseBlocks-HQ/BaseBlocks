import enMessages from "./en.json";
import frMessages from "./fr.json";
import { defaultLocale, type Locale } from "../locales";

type DeepWidenStrings<T> = {
  [K in keyof T]: T[K] extends string
    ? string
    : T[K] extends Record<string, unknown>
      ? DeepWidenStrings<T[K]>
      : T[K];
};

export type AppMessages = DeepWidenStrings<typeof enMessages>;

export const messagesByLocale = {
  en: enMessages,
  fr: frMessages as AppMessages,
} as const satisfies Record<Locale, AppMessages>;

export function getMessages(locale: Locale): AppMessages {
  return messagesByLocale[locale] ?? messagesByLocale[defaultLocale];
}
