import Image from "next/image";
import type { ReactNode } from "react";
import { FlickeringGrid } from "./flickering-grid";
import { Reveal } from "./reveal";

interface HeroSectionProps {
  authCta: ReactNode;
  docsCta: ReactNode;
}

export function HeroSection({ authCta, docsCta }: HeroSectionProps) {
  return (
    <section className="relative z-10 isolate min-h-svh overflow-hidden pt-28 pb-20 sm:-mt-14 sm:min-h-0 sm:pt-[9.5rem] sm:pb-28">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <FlickeringGrid className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/76 via-background/52 to-background/16 dark:from-background/80 dark:via-background/56 dark:to-background/20" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="relative lg:max-w-[42%]">
          <Reveal delay={0.2}>
            <h1
              className="font-bold leading-[0.98] tracking-tight sm:font-normal"
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)" }}
              aria-label="Build sites your team will actually use"
            >
              <span className="landing-pixel-grid block">BUILD SITES</span>
              <span className="landing-pixel-grid block">YOUR TEAM WILL</span>
              <span className="block">
                <span className="landing-pixel-grid">ACTUALLY </span>
                <span className="landing-pixel-square text-amber-500 dark:text-amber-400">
                  USE.
                </span>
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.55}>
            <div className="mt-9 flex flex-wrap gap-3">
              {authCta}
              {docsCta}
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal
        delay={0.35}
        className="relative z-10 mt-14 hidden px-6 sm:block lg:absolute lg:top-1/2 lg:-right-[5vw] lg:mt-0 lg:w-[58vw] lg:-translate-y-1/2 lg:pr-0 lg:pl-0 xl:-right-[4vw] xl:w-[52vw]"
      >
        <div className="relative mx-auto max-w-md select-none sm:max-w-none">
          <Image
            src="/landing/hero-image-dark.png"
            alt="BaseBlocks editor showing a site with dashboard, table, and rich text blocks"
            className="relative rounded-xl border border-neutral-700 shadow-2xl lg:rounded-r-none lg:border-r-0"
            fetchPriority="high"
            loading="eager"
            sizes="(max-width: 640px) calc(100vw - 48px), (max-width: 1024px) 100vw, 58vw"
            width={3420}
            height={1950}
          />
        </div>
      </Reveal>
    </section>
  );
}
