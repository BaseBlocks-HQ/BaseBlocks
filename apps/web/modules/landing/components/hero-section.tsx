import { landingFonts } from "@/modules/landing/constants";
import type { TranslateFn } from "@/modules/landing/types";
import { Button } from "@baseblocks/ui/button";
import { GitFork, Github } from "lucide-react";
import type { ReactNode } from "react";
import { BlurIn } from "./blur-in";
import { EditorMockup } from "./editor-mockup";
import { GridPattern } from "./grid-pattern";

interface HeroSectionProps {
  authCta: ReactNode;
  docsCta: ReactNode;
  landingTranslations: TranslateFn;
}

export function HeroSection({
  authCta,
  docsCta,
  landingTranslations,
}: HeroSectionProps) {
  return (
    <section className="relative z-10 overflow-x-clip max-sm:h-screen max-sm:overflow-hidden max-sm:pt-0 max-sm:pb-0 sm:pt-24 sm:pb-28">
      <GridPattern />
      <div className="relative z-10 mx-auto max-w-6xl px-6 max-sm:flex max-sm:min-h-screen max-sm:flex-col max-sm:justify-center max-sm:pt-[7.5rem] max-sm:pb-8">
        <div className="relative z-10 lg:max-w-[42%]">
          <BlurIn delay={0.1}>
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-sm border border-foreground/10 bg-foreground px-3 py-1 text-[11px] tracking-wide text-background"
              style={{ fontFamily: landingFonts.square }}
            >
              <GitFork className="h-3 w-3" />
              {landingTranslations("badge")}
            </div>
          </BlurIn>

          <BlurIn delay={0.2}>
            <h1
              className="leading-[0.98] tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)" }}
              aria-label="Build sites your team will actually use"
            >
              <span className="block" style={{ fontFamily: landingFonts.grid }}>
                BUILD SITES
              </span>
              <span className="block" style={{ fontFamily: landingFonts.grid }}>
                YOUR TEAM WILL
              </span>
              <span className="block">
                <span style={{ fontFamily: landingFonts.grid }}>ACTUALLY </span>
                <span
                  className="text-amber-500 dark:text-amber-400"
                  style={{ fontFamily: landingFonts.square }}
                >
                  USE.
                </span>
              </span>
            </h1>
          </BlurIn>

          <BlurIn delay={0.4}>
            <p className="mt-7 max-w-sm text-[0.94rem] leading-relaxed text-muted-foreground lg:max-w-[22rem]">
              {landingTranslations("heroSubtitle")}
            </p>
          </BlurIn>

          <BlurIn delay={0.55}>
            <div className="mt-8 flex flex-wrap gap-3">
              {authCta}
              {docsCta}
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  variant="outline"
                  size="lg"
                  className="gap-2 bg-background dark:bg-background dark:hover:bg-accent"
                >
                  <Github className="h-4 w-4" />
                  {landingTranslations("viewOnGithub")}
                </Button>
              </a>
            </div>
          </BlurIn>
        </div>
      </div>

      <BlurIn
        delay={0.35}
        className="mt-12 -mx-6 px-0 max-sm:absolute max-sm:inset-0 max-sm:z-0 max-sm:mt-0 lg:absolute lg:top-1/2 lg:-right-[5vw] lg:mt-0 lg:mx-0 lg:w-[58vw] lg:-translate-y-1/2 lg:pr-0 lg:pl-0 xl:-right-[4vw] xl:w-[52vw]"
      >
        <EditorMockup />
      </BlurIn>
    </section>
  );
}
