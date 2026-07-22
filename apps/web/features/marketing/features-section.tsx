import {
  IconAppStack,
  IconColorPalette,
  IconFolders,
  IconRocket,
  IconSitemap,
  IconUsers,
} from "nucleo-glass";
import type { ComponentType, SVGProps } from "react";
import { Reveal } from "./reveal";

type TranslateFn = (key: string) => string;
type LandingIcon = ComponentType<SVGProps<SVGSVGElement>>;

const features: readonly {
  icon: LandingIcon;
  titleKey: string;
  descKey: string;
  num: string;
  iconClassName: string;
}[] = [
  {
    icon: IconAppStack,
    titleKey: "editorTitle",
    descKey: "editorDesc",
    num: "01",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconSitemap,
    titleKey: "pageTreeTitle",
    descKey: "pageTreeDesc",
    num: "02",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconFolders,
    titleKey: "filesSearchTitle",
    descKey: "filesSearchDesc",
    num: "03",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconUsers,
    titleKey: "teamWorkspacesTitle",
    descKey: "teamWorkspacesDesc",
    num: "04",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconRocket,
    titleKey: "publishingTitle",
    descKey: "publishingDesc",
    num: "05",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: IconColorPalette,
    titleKey: "brandingTitle",
    descKey: "brandingDesc",
    num: "06",
    iconClassName: "group-hover:scale-110",
  },
];

interface FeaturesSectionProps {
  landingTranslations: TranslateFn;
}

export function FeaturesSection({ landingTranslations }: FeaturesSectionProps) {
  return (
    <section id="features" className="scroll-mt-20 px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="max-w-xl">
            <div className="landing-pixel-square mb-4 text-xs tracking-[0.22em] text-amber-700 dark:text-amber-400">
              {landingTranslations("featuresLabel").toUpperCase()}
            </div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {landingTranslations("featuresTitle")}
            </h2>
            <p className="mt-4 text-[0.94rem] leading-relaxed text-muted-foreground">
              {landingTranslations("featuresSubtitle")}
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal key={feature.titleKey} delay={0.06 * index}>
              <div className="group relative isolate h-full overflow-hidden rounded-xl bg-background/95 p-6 shadow-sm shadow-black/[0.04] transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/[0.04] dark:bg-white/[0.02] dark:shadow-none">
                <feature.icon
                  className={`absolute right-[-16px] bottom-[-16px] z-0 h-28 w-28 opacity-[0.58] transition-transform duration-300 dark:opacity-35 ${feature.iconClassName}`}
                />
                <div className="relative z-10 mb-3 font-mono text-[11px] text-muted-foreground">
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
