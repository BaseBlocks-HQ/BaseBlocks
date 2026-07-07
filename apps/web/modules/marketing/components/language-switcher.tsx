"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { cn } from "@baseblocks/ui/lib/utils";
import { ChevronsUpDown, Earth } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

const languageNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

const languageFlags: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇺🇸",
};

export function LanguageSwitcher({
  triggerClassName,
  variant = "icon",
}: {
  triggerClassName?: string;
  variant?: "icon" | "row";
} = {}) {
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
        {variant === "row" ? (
          <Button
            className={cn(
              "flex h-10 w-full items-center gap-2 rounded-[1.15rem] border border-transparent px-3 text-muted-foreground hover:bg-accent/55 hover:text-foreground sm:rounded-[1.25rem]",
              triggerClassName,
            )}
            title={t("select")}
            type="button"
            variant="ghost"
          >
            <Earth className="h-4 w-4 shrink-0" strokeWidth={1.75} />
            <span className="min-w-0 flex-1 truncate text-left text-foreground">
              {languageNames[locale]}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        ) : (
          <Button
            className={cn(
              "text-muted-foreground hover:text-foreground",
              triggerClassName,
            )}
            size="icon"
            title={t("select")}
            variant="ghost"
          >
            <Earth className="h-4 w-4" strokeWidth={1.75} />
            <span className="sr-only">{t("select")}</span>
          </Button>
        )}
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
