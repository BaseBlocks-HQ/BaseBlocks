import type { Locale } from "@baseblocks/i18n";
import { GitFork } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { LandingCopy } from "./landing-page";
import { LandingControls } from "./landing-controls";
import { Reveal } from "./reveal";

interface FooterSectionProps {
  authCta: ReactNode;
  copy: LandingCopy;
  docsCta: ReactNode;
  labels: {
    selectLanguage: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
  };
  locale: Locale;
}

export function FooterSection({
  authCta,
  copy,
  docsCta,
  labels,
  locale,
}: FooterSectionProps) {
  return (
    <Reveal>
      <footer className="border-t border-border/40 bg-muted/20 px-6 py-10 dark:border-white/[0.04] dark:bg-white/[0.015] sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 py-14 sm:py-20 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-16">
            <div>
              <div className="landing-pixel-triangle mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400">
                BASEBLOCKS
              </div>
              <h2 className="landing-pixel-grid max-w-2xl text-3xl leading-tight tracking-tight sm:text-5xl">
                {copy.ctaTitle}
              </h2>
            </div>

            <div>
              <p className="max-w-sm text-[0.94rem] leading-relaxed text-muted-foreground">
                {copy.ctaSubtitle}
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
                <div className="landing-pixel-square text-sm tracking-tight">
                  BaseBlocks
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {copy.footerCopyright}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <LandingControls labels={labels} locale={locale} />
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:bg-accent/50"
              >
                <GitFork aria-hidden="true" className="h-3.5 w-3.5" />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </Reveal>
  );
}
