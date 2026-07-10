import Image from "next/image";
import { FlickeringGrid } from "./flickering-grid";
import { Reveal } from "./reveal";

type TranslateFn = (key: string) => string;

const steps: readonly {
  num: string;
  titleKey: string;
  descKey: string;
  imageAltKey: string;
  image: {
    light: string;
    dark: string;
  };
}[] = [
  {
    num: "01",
    titleKey: "step1Title",
    descKey: "step1Desc",
    imageAltKey: "step1ImageAlt",
    image: {
      light: "/landing/steps/create-workspace-light.png",
      dark: "/landing/steps/create-workspace-dark.png",
    },
  },
  {
    num: "02",
    titleKey: "step2Title",
    descKey: "step2Desc",
    imageAltKey: "step2ImageAlt",
    image: {
      light: "/landing/steps/build-site-light.png",
      dark: "/landing/steps/build-site-dark.png",
    },
  },
  {
    num: "03",
    titleKey: "step3Title",
    descKey: "step3Desc",
    imageAltKey: "step3ImageAlt",
    image: {
      light: "/landing/steps/publish-team-light.png",
      dark: "/landing/steps/publish-team-dark.png",
    },
  },
];

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
      className="relative isolate scroll-mt-20 overflow-hidden border-t border-border/40 px-6 py-24 sm:py-32 dark:border-white/[0.04]"
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
              style={{ fontFamily: "var(--font-geist-pixel-triangle)" }}
            >
              {landingTranslations("stepsLabel").toUpperCase()}
            </div>
            <h2
              className="text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: "var(--font-geist-pixel-grid)" }}
            >
              {landingTranslations("stepsTitle")}
            </h2>
          </div>
        </Reveal>

        <div className="mt-16 space-y-6 sm:space-y-8">
          {steps.map((step, index) => (
            <Reveal key={step.titleKey} delay={0.1 * index}>
              {(() => {
                const stepImage = isDarkTheme
                  ? step.image.dark
                  : step.image.light;

                return (
                  <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
                    <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                      <div
                        className="relative z-20 mb-4 text-7xl text-amber-600 dark:text-amber-400 sm:text-8xl"
                        style={{
                          fontFamily: "var(--font-geist-pixel-circle)",
                          lineHeight: 1,
                        }}
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
                      <div className="group relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-border/60 bg-background/70 text-left shadow-sm dark:border-white/[0.08] dark:bg-background/50">
                        <Image
                          src={stepImage}
                          alt={landingTranslations(step.imageAltKey)}
                          fill
                          className="object-cover"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
