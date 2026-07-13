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
      <footer className="border-t border-border/40 bg-muted/20 px-6 py-10 dark:border-white/[0.04] dark:bg-white/[0.015] sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
            <div>
              <div
                className="mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400"
                style={{ fontFamily: "var(--font-geist-pixel-triangle)" }}
              >
                BASEBLOCKS
              </div>
              <h2
                className="max-w-2xl text-3xl leading-tight tracking-tight sm:text-5xl"
                style={{ fontFamily: "var(--font-geist-pixel-grid)" }}
              >
                {landingTranslations("ctaTitle")}
              </h2>
            </div>

            <div>
              <p className="max-w-sm text-[0.94rem] leading-relaxed text-muted-foreground">
                {landingTranslations("ctaSubtitle")}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {authCta}
                {docsCta}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 border-t border-border/50 py-7 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Image
                src="/brand/baseblocks-logo.png"
                alt=""
                width={600}
                height={600}
                sizes="28px"
                className="size-7 shrink-0 object-contain"
              />
              <div>
                <div
                  className="text-sm tracking-tight"
                  style={{ fontFamily: "var(--font-geist-pixel-square)" }}
                >
                  BaseBlocks
                </div>
                <div className="mt-1 text-xs text-muted-foreground/60">
                  {landingTranslations("footerCopyright")}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center">
                <LandingLanguageSwitcher />
                <LandingThemeMenu />
              </div>
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:bg-accent/50"
              >
                <GitFork className="h-3.5 w-3.5" />
                GitHub
              </a>
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
          className="rounded-full text-muted-foreground hover:text-foreground"
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
          className="relative rounded-full text-muted-foreground hover:text-foreground"
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
