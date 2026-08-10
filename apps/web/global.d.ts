import type { AppMessages, Locale as BaseBlocksLocale } from "@baseblocks/i18n";

declare module "next-intl" {
  interface AppConfig {
    Locale: BaseBlocksLocale;
    Messages: AppMessages;
  }
}
