import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "./reveal";

interface HeroSectionProps {
  authCta: ReactNode;
  docsCta: ReactNode;
}

export function HeroSection({ authCta, docsCta }: HeroSectionProps) {
  return (
    <section className="relative z-10 isolate overflow-x-clip pt-28 pb-20 sm:pt-24 sm:pb-28">
      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="relative lg:max-w-[42%]">
          <Reveal delay={0.2}>
            <h1
              className="leading-[0.98] tracking-tight"
              style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)" }}
              aria-label="Build sites your team will actually use"
            >
              <span
                className="block"
                style={{ fontFamily: "var(--font-geist-pixel-grid)" }}
              >
                BUILD SITES
              </span>
              <span
                className="block"
                style={{ fontFamily: "var(--font-geist-pixel-grid)" }}
              >
                YOUR TEAM WILL
              </span>
              <span className="block">
                <span style={{ fontFamily: "var(--font-geist-pixel-grid)" }}>
                  ACTUALLY{" "}
                </span>
                <span
                  className="text-amber-500 dark:text-amber-400"
                  style={{ fontFamily: "var(--font-geist-pixel-square)" }}
                >
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
        className="relative z-10 mt-14 px-6 lg:absolute lg:top-1/2 lg:-right-[5vw] lg:mt-0 lg:w-[58vw] lg:-translate-y-1/2 lg:pr-0 lg:pl-0 xl:-right-[4vw] xl:w-[52vw]"
      >
        <div className="relative select-none">
          <Image
            src="/landing/hero-image-light.png"
            alt="BaseBlocks editor showing a site with dashboard, table, and rich text blocks"
            className="relative rounded-xl border border-neutral-200 shadow-2xl lg:rounded-r-none lg:border-r-0 dark:hidden dark:border-white/[0.1] dark:lg:border-r-0"
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            width={3420}
            height={1950}
          />
          <Image
            src="/landing/hero-image-dark.png"
            alt="BaseBlocks editor showing a site with dashboard, table, and rich text blocks"
            className="relative hidden rounded-xl border border-neutral-200 shadow-2xl lg:rounded-r-none lg:border-r-0 dark:block dark:border-white/[0.1] dark:lg:border-r-0"
            priority
            sizes="(max-width: 1024px) 100vw, 58vw"
            width={3420}
            height={1950}
          />
        </div>
      </Reveal>
    </section>
  );
}
