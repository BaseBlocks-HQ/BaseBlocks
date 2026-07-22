import type { Locale } from "@baseblocks/i18n";
import { GitFork } from "lucide-react";
import type { ReactNode } from "react";
import { DeferredLandingControls } from "./deferred-landing-controls";
import type { LandingCopy } from "./landing-page";
import { optimizedImageUrl } from "./optimized-image-url";
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
      <footer className="px-6 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <h2 className="landing-pixel-grid max-w-2xl text-3xl leading-tight tracking-tight sm:text-5xl">
              {copy.ctaTitle}
            </h2>

            <div className="flex shrink-0 flex-wrap gap-3 lg:justify-end">
              {authCta}
              {docsCta}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-6 sm:mt-16 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              {/* biome-ignore lint/performance/noImgElement: This uses the Next optimizer URL without its client runtime. */}
              <img
                src={optimizedImageUrl("/brand/baseblocks-logo.png", 64)}
                alt=""
                width={28}
                height={28}
                className="size-7 shrink-0 object-contain"
                loading="lazy"
                decoding="async"
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
              <DeferredLandingControls labels={labels} locale={locale} />
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground dark:hover:bg-accent/50"
              >
                <GitFork
                  aria-hidden="true"
                  className="size-4"
                  strokeWidth={1.75}
                />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </Reveal>
  );
}
