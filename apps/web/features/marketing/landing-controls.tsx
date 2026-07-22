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
import { Earth, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";

interface LandingControlsProps {
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
  const { setTheme } = useTheme();
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
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className={cn(locale === "en" && "bg-accent")}
            onClick={() => switchLocale("en")}
          >
            <span aria-hidden="true" className="mr-2">
              🇺🇸
            </span>
            English
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(locale === "fr" && "bg-accent")}
            onClick={() => switchLocale("fr")}
          >
            <span aria-hidden="true" className="mr-2">
              🇫🇷
            </span>
            Français
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ThemeButton label={labels.themeLight} onClick={() => setTheme("light")}>
        <Sun aria-hidden="true" />
      </ThemeButton>
      <ThemeButton label={labels.themeDark} onClick={() => setTheme("dark")}>
        <Moon aria-hidden="true" />
      </ThemeButton>
      <ThemeButton
        label={labels.themeSystem}
        onClick={() => setTheme("system")}
      >
        <Monitor aria-hidden="true" />
      </ThemeButton>
    </div>
  );
}

function ThemeButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="rounded-full text-muted-foreground hover:text-foreground"
      onClick={onClick}
      size="icon"
      title={label}
      variant="ghost"
    >
      {children}
    </Button>
  );
}
