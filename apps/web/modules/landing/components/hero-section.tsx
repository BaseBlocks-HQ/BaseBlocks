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
  landingTranslations: TranslateFn;
}

export function HeroSection({
  authCta,
  landingTranslations,
}: HeroSectionProps) {
  return (
    <section className="relative z-10 overflow-x-clip pt-16 pb-20 sm:pt-24 sm:pb-28">
      <GridPattern />
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="relative z-10 lg:max-w-[42%]">
          <BlurIn delay={0.1}>
            <div
              className="mb-7 inline-flex items-center gap-2 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-[11px] tracking-wide text-amber-700 dark:border-amber-400/25 dark:text-amber-400"
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
              aria-label="Build sites your team will actually use."
            >
              <span className="block" style={{ fontFamily: landingFonts.grid }}>
                BUILD SITES
              </span>
              <span className="block" style={{ fontFamily: landingFonts.grid }}>
                YOUR TEAM WILL
              </span>
              <span className="block">
                <span
                  className="text-amber-500 dark:text-amber-400"
                  style={{ fontFamily: landingFonts.square }}
                >
                  ACTUALLY
                </span>
                <span style={{ fontFamily: landingFonts.grid }}> USE.</span>
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
              <a
                href="https://github.com/naaiyy/BaseBlocks"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="lg" className="gap-2">
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
        className="mt-14 px-6 lg:absolute lg:top-1/2 lg:-right-[5vw] lg:mt-0 lg:w-[58vw] lg:-translate-y-1/2 lg:pr-0 lg:pl-0 xl:-right-[4vw] xl:w-[52vw]"
      >
        <EditorMockup />
      </BlurIn>
    </section>
  );
}
