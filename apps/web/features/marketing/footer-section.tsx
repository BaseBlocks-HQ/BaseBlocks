import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@baseblocks/ui/lib/utils";
import type { Locale } from "@baseblocks/i18n";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Earth, GitFork, Moon, Sun } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

type TranslateFn = (key: string) => string;

interface FooterSectionProps {
  authCta: ReactNode;
  docsCta: ReactNode;
  landingTranslations: TranslateFn;
}

export function FooterSection({
  authCta,
  docsCta,
  landingTranslations,
}: FooterSectionProps) {
  return (
    <Reveal>
      <footer className="border-t border-border/40 bg-muted/20 px-6 dark:border-white/[0.04] dark:bg-white/[0.015]">
        <div className="mx-auto max-w-6xl">
          <div className="py-24 sm:py-32">
            <h2
              className="max-w-xl text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-geist-pixel-grid)" }}
            >
              {landingTranslations("ctaTitle")}
            </h2>
            <p className="mt-4 max-w-sm text-[0.94rem] text-muted-foreground">
              {landingTranslations("ctaSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {authCta}
              {docsCta}
            </div>
          </div>

          <div className="border-t border-border/40 py-6 dark:border-white/[0.04]">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/brand/baseblocks-logo.png"
                  alt=""
                  width={600}
                  height={600}
                  sizes="24px"
                  className="h-6 w-6 shrink-0 object-contain"
                />
                <span className="text-xs text-muted-foreground/60">
                  {landingTranslations("footerCopyright")}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <LandingLanguageSwitcher />
                  <LandingThemeMenu />
                </div>
                <a
                  href="https://github.com/naaiyy/BaseBlocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <GitFork className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </Reveal>
  );
}

const languageNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

const languageFlags: Record<Locale, string> = {
  fr: "🇫🇷",
  en: "🇺🇸",
};

function LandingLanguageSwitcher() {
  const t = useTranslations("language");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="text-muted-foreground hover:text-foreground"
          size="icon"
          title={t("select")}
          variant="ghost"
        >
          <Earth className="h-4 w-4" strokeWidth={1.75} />
          <span className="sr-only">{t("select")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => router.replace(pathname, { locale: loc })}
            className={cn(locale === loc && "bg-accent")}
          >
            <span className="mr-2">{languageFlags[loc]}</span>
            {languageNames[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LandingThemeMenu() {
  const { setTheme } = useTheme();
  const t = useTranslations("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="relative text-muted-foreground hover:text-foreground"
          size="icon"
          variant="ghost"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          {t("themeLight")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          {t("themeDark")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          {t("themeSystem")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
