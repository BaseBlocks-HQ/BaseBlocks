import { landingFonts } from "@/modules/landing/constants";
import type { TranslateFn } from "@/modules/landing/constants";
import type { ReactNode } from "react";
import { HeroEditorPreview } from "./hero-editor-preview";
import { Reveal } from "./reveal";
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
    <section className="relative isolate overflow-x-clip pt-28 pb-20 sm:pt-24 sm:pb-28">
      <div className="relative mx-auto max-w-6xl px-6">
        <div className="relative lg:max-w-[42%]">
          <Reveal delay={0.2}>
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
          </Reveal>

          <Reveal delay={0.4}>
            <p className="mt-7 max-w-sm text-[0.94rem] leading-relaxed text-muted-foreground lg:max-w-[22rem]">
              {landingTranslations("heroSubtitle")}
            </p>
          </Reveal>

          <Reveal delay={0.55}>
            <div className="mt-8 flex flex-wrap gap-3">
              {authCta}
              {docsCta}
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal
        delay={0.35}
        className="mt-14 px-6 lg:absolute lg:top-1/2 lg:-right-[5vw] lg:mt-0 lg:w-[58vw] lg:-translate-y-1/2 lg:pr-0 lg:pl-0 xl:-right-[4vw] xl:w-[52vw]"
      >
        <HeroEditorPreview />
      </Reveal>
    </section>
  );
}
