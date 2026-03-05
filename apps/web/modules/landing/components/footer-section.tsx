import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { landingFonts } from "@/modules/landing/constants";
import type { TranslateFn } from "@/modules/landing/types";
import { Button } from "@baseblocks/ui/button";
import { Github } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

interface FooterSectionProps {
  isLoading: boolean;
  authCta: ReactNode;
  landingTranslations: TranslateFn;
  commonTranslations: TranslateFn;
}

export function FooterSection({
  isLoading,
  authCta,
  landingTranslations,
  commonTranslations,
}: FooterSectionProps) {
  return (
    <footer className="border-t border-border/40 bg-muted/20 px-6 dark:border-white/[0.04] dark:bg-white/[0.015]">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="py-24 sm:py-32">
            <h2
              className="max-w-xl text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: landingFonts.grid }}
            >
              {landingTranslations("ctaTitle")}
            </h2>
            <p className="mt-4 max-w-sm text-[0.94rem] text-muted-foreground">
              {landingTranslations("ctaSubtitle")}
            </p>
            <div className="mt-8">
              {isLoading ? (
                <Button size="lg" disabled>
                  {commonTranslations("loading")}
                </Button>
              ) : (
                authCta
              )}
            </div>
          </div>
        </Reveal>

        <div className="border-t border-border/40 py-6 dark:border-white/[0.04]">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[10px] text-background"
                style={{ fontFamily: landingFonts.square }}
              >
                B
              </div>
              <span className="text-xs text-muted-foreground/60">
                {landingTranslations("footerCopyright")}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5">
                <LanguageSwitcher />
                <ModeToggle />
              </div>
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Github className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
