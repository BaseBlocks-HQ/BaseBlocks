import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
	// All supported locales
	locales: ["fr", "en"],

	// Default locale when no locale is detected
	defaultLocale: "fr",

	// Locale prefix strategy: 'always' | 'as-needed' | 'never'
	// 'as-needed' hides the default locale from the URL
	localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
