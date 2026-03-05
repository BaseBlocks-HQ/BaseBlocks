import { landingFonts, landingSteps } from "@/modules/landing/constants";
import type { TranslateFn } from "@/modules/landing/types";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import Image from "next/image";
import { FlickeringGrid } from "./flickering-grid";
import { Reveal } from "./reveal";

interface StepsSectionProps {
  isDarkTheme: boolean;
  gridColor: string;
  gridOpacity: number;
  landingTranslations: TranslateFn;
}

export function StepsSection({
  isDarkTheme,
  gridColor,
  gridOpacity,
  landingTranslations,
}: StepsSectionProps) {
  return (
    <section
      id="how-it-works"
      className="relative scroll-mt-20 overflow-hidden border-t border-border/40 px-6 py-24 sm:py-32 dark:border-white/[0.04]"
    >
      <FlickeringGrid
        className="absolute inset-0 z-0"
        color={gridColor}
        squareSize={4}
        gridGap={8}
        maxOpacity={gridOpacity}
        flickerChance={0.25}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b ${
          isDarkTheme
            ? "from-background/88 via-background/62 to-background/88"
            : "from-background/80 via-background/52 to-background/80"
        }`}
      />
      <div className="relative z-10 mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-xl">
            <div
              className="mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400"
              style={{ fontFamily: landingFonts.triangle }}
            >
              {landingTranslations("stepsLabel").toUpperCase()}
            </div>
            <h2
              className="text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: landingFonts.grid }}
            >
              {landingTranslations("stepsTitle")}
            </h2>
          </div>
        </Reveal>

        <div className="mt-16 space-y-6 sm:space-y-8">
          {landingSteps.map((step, index) => (
            <Reveal key={step.titleKey} delay={0.1 * index}>
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div
                    className="relative z-20 mb-4 text-7xl text-amber-600 dark:text-amber-400 sm:text-8xl"
                    style={{ fontFamily: landingFonts.circle, lineHeight: 1 }}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-[1rem] font-semibold sm:text-[1.05rem]">
                    {landingTranslations(step.titleKey)}
                  </h3>
                  <p className="mt-2 text-[0.92rem] leading-relaxed text-muted-foreground sm:text-sm">
                    {landingTranslations(step.descKey)}
                  </p>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="group relative aspect-[16/9] w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border/60 bg-background/70 text-left shadow-sm transition-colors hover:border-amber-500/30 dark:border-white/[0.08] dark:bg-background/50 dark:hover:border-amber-400/25"
                        aria-label={`Open ${landingTranslations(step.imageAltKey)} image`}
                      >
                        <Image
                          src={step.image}
                          alt={landingTranslations(step.imageAltKey)}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-[1.015]"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          placeholder="blur"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/45 via-transparent to-transparent" />
                      </button>
                    </DialogTrigger>
                    <DialogContent
                      onOpenAutoFocus={(event) => event.preventDefault()}
                      className="z-[80] !w-auto !max-w-[96vw] overflow-visible border-none bg-transparent p-0 shadow-none sm:!max-w-[96vw]"
                    >
                      <DialogTitle className="sr-only">
                        {landingTranslations(step.imageAltKey)}
                      </DialogTitle>
                      <Image
                        src={step.image}
                        alt={landingTranslations(step.imageAltKey)}
                        className="block h-auto max-h-[92vh] w-auto max-w-[96vw] rounded-2xl border border-border/70 bg-background object-contain shadow-2xl shadow-black/35 dark:border-white/[0.1]"
                        sizes="96vw"
                        placeholder="blur"
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
