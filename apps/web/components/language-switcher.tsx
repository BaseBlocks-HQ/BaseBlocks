"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const languageNames: Record<Locale, string> = {
	fr: "Français",
	en: "English",
};

const languageFlags: Record<Locale, string> = {
	fr: "🇫🇷",
	en: "🇺🇸",
};

export function LanguageSwitcher() {
	const t = useTranslations("language");
	const locale = useLocale() as Locale;
	const router = useRouter();
	const pathname = usePathname();

	const handleLocaleChange = (newLocale: Locale) => {
		router.replace(pathname, { locale: newLocale });
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" title={t("select")}>
					<Globe className="h-4 w-4" />
					<span className="sr-only">{t("select")}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{routing.locales.map((loc) => (
					<DropdownMenuItem
						key={loc}
						onClick={() => handleLocaleChange(loc)}
						className={locale === loc ? "bg-accent" : ""}
					>
						<span className="mr-2">{languageFlags[loc]}</span>
						{languageNames[loc]}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
