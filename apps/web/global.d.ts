import type { AppMessages } from "@baseblocks/i18n";

declare global {
  // Use type safe message keys with `next-intl`
  type IntlMessages = AppMessages;
}
