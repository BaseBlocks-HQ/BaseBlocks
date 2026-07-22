"use client";

import type { Locale } from "@baseblocks/i18n";
import { Button } from "@baseblocks/ui/button";
import { cn } from "@baseblocks/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Check, Earth, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";

export interface LandingControlsProps {
  labels: {
    selectLanguage: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
  };
  locale: Locale;
}

export function LandingControls({ labels, locale }: LandingControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const switchLocale = (nextLocale: Locale) => {
    const unprefixed = pathname.replace(/^\/(en|fr)(?=\/|$)/, "") || "/";
    router.replace(nextLocale === "en" ? unprefixed : `/fr${unprefixed}`);
  };

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={labels.selectLanguage}
            className="rounded-full text-muted-foreground hover:text-foreground"
            size="icon"
            title={labels.selectLanguage}
            variant="ghost"
          >
            <Earth aria-hidden="true" className="size-4" strokeWidth={1.75} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <DropdownMenuItem
            className={cn(locale === "en" && "bg-accent")}
            onClick={() => switchLocale("en")}
          >
            <span aria-hidden="true">🇺🇸</span>
            <span className="flex-1">English</span>
            {locale === "en" ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(locale === "fr" && "bg-accent")}
            onClick={() => switchLocale("fr")}
          >
            <span aria-hidden="true">🇫🇷</span>
            <span className="flex-1">Français</span>
            {locale === "fr" ? <Check className="size-4" /> : null}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={labels.themeSystem}
            className="relative rounded-full text-muted-foreground hover:text-foreground"
            size="icon"
            title={labels.themeSystem}
            variant="ghost"
          >
            <Sun
              className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
              strokeWidth={1.75}
            />
            <Moon
              className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
              strokeWidth={1.75}
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top">
          <ThemeItem
            active={theme === "light"}
            label={labels.themeLight}
            onSelect={() => setTheme("light")}
          />
          <ThemeItem
            active={theme === "dark"}
            label={labels.themeDark}
            onSelect={() => setTheme("dark")}
          />
          <ThemeItem
            active={theme === "system"}
            label={labels.themeSystem}
            onSelect={() => setTheme("system")}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ThemeItem({
  active,
  label,
  onSelect,
}: {
  active: boolean;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onSelect}>
      <span className="flex-1">{label}</span>
      {active ? <Check className="size-4" /> : null}
    </DropdownMenuItem>
  );
}
