import { landingFeatures, landingFonts } from "@/modules/landing/constants";
import type { TranslateFn } from "@/modules/landing/types";
import { Reveal } from "./reveal";

interface FeaturesSectionProps {
  landingTranslations: TranslateFn;
}

export function FeaturesSection({ landingTranslations }: FeaturesSectionProps) {
  return (
    <section
      id="features"
      className="scroll-mt-20 border-t border-border/40 bg-muted/20 px-6 py-24 sm:py-32 dark:border-white/[0.04] dark:bg-white/[0.015]"
    >
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-xl">
            <div
              className="mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400"
              style={{ fontFamily: landingFonts.triangle }}
            >
              {landingTranslations("featuresLabel").toUpperCase()}
            </div>
            <h2
              className="text-3xl tracking-tight sm:text-4xl"
              style={{ fontFamily: landingFonts.grid }}
            >
              {landingTranslations("featuresTitle")}
            </h2>
            <p className="mt-4 text-[0.94rem] leading-relaxed text-muted-foreground">
              {landingTranslations("featuresSubtitle")}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landingFeatures.map((feature, index) => (
            <Reveal key={feature.titleKey} delay={0.06 * index}>
              <div className="group relative isolate h-full overflow-hidden rounded-xl border border-border/70 bg-background/95 p-6 shadow-sm shadow-black/[0.04] transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/[0.04] dark:border-white/[0.06] dark:bg-white/[0.02] dark:shadow-none dark:hover:border-amber-400/20">
                <feature.icon
                  className={`absolute right-[-16px] bottom-[-16px] z-0 h-28 w-28 opacity-[0.58] transition-transform duration-300 dark:opacity-35 ${feature.iconClassName}`}
                />
                <div
                  className="relative z-10 mb-3 text-[11px] text-muted-foreground/40"
                  style={{ fontFamily: landingFonts.circle }}
                >
                  {feature.num}
                </div>
                <h3 className="relative z-10 text-[0.94rem] font-semibold">
                  {landingTranslations(feature.titleKey)}
                </h3>
                <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {landingTranslations(feature.descKey)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
