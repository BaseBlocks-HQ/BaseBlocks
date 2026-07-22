import { FlickeringGrid } from "./flickering-grid";
import { optimizedImageSrcSet, optimizedImageUrl } from "./optimized-image-url";
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
  landingTranslations: TranslateFn;
}

export function StepsSection({ landingTranslations }: StepsSectionProps) {
  return (
    <section
      id="how-it-works"
      className="relative isolate scroll-mt-20 overflow-hidden px-6 py-24 sm:py-32"
    >
      <FlickeringGrid className="absolute inset-0 z-0" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-background/82 via-background/58 to-background/90 dark:from-background/90 dark:via-background/68 dark:to-background/94" />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-xl">
            <div className="landing-pixel-square mb-4 text-xs tracking-[0.22em] text-amber-700 dark:text-amber-400">
              {landingTranslations("stepsLabel").toUpperCase()}
            </div>
            <h2 className="landing-pixel-grid text-3xl tracking-tight sm:text-4xl">
              {landingTranslations("stepsTitle")}
            </h2>
          </div>
        </Reveal>

        <div className="mt-16 space-y-6 sm:space-y-8">
          {steps.map((step, index) => (
            <Reveal key={step.titleKey} delay={0.1 * index}>
              <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <div className="landing-pixel-square relative z-20 mb-4 text-7xl leading-none text-amber-700 dark:text-amber-400 sm:text-8xl">
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
                    {/* biome-ignore lint/performance/noImgElement: Native responsive images avoid hydrating this static marketing page. */}
                    <img
                      src={optimizedImageUrl(step.image.light, 1080)}
                      srcSet={optimizedImageSrcSet(
                        step.image.light,
                        [640, 750, 828, 960, 1080],
                      )}
                      alt={landingTranslations(step.imageAltKey)}
                      width={1920}
                      height={1080}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover dark:hidden"
                      sizes="(max-width: 1023px) calc(100vw - 48px), 550px"
                    />
                    {/* biome-ignore lint/performance/noImgElement: Native responsive images avoid hydrating this static marketing page. */}
                    <img
                      src={optimizedImageUrl(step.image.dark, 1080)}
                      srcSet={optimizedImageSrcSet(
                        step.image.dark,
                        [640, 750, 828, 960, 1080],
                      )}
                      alt={landingTranslations(step.imageAltKey)}
                      width={1920}
                      height={1080}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 hidden h-full w-full object-cover dark:block"
                      sizes="(max-width: 1023px) calc(100vw - 48px), 550px"
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
