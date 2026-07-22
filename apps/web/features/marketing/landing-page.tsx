import { Link } from "@/i18n/navigation";
import { Button } from "@baseblocks/ui/button";
import { ArrowRight } from "lucide-react";
import { FeaturesSection } from "./features-section";
import { FooterSection } from "./footer-section";
import { HeroSection } from "./hero-section";
import { LandingHeader } from "./landing-header";
import { StepsSection } from "./steps-section";

export type LandingCopy = Record<
  | "brandingDesc"
  | "brandingTitle"
  | "ctaSubtitle"
  | "ctaTitle"
  | "editorDesc"
  | "editorTitle"
  | "featuresLabel"
  | "featuresSubtitle"
  | "featuresTitle"
  | "filesSearchDesc"
  | "filesSearchTitle"
  | "footerCopyright"
  | "getStarted"
  | "pageTreeDesc"
  | "pageTreeTitle"
  | "publishingDesc"
  | "publishingTitle"
  | "step1Desc"
  | "step1ImageAlt"
  | "step1Title"
  | "step2Desc"
  | "step2ImageAlt"
  | "step2Title"
  | "step3Desc"
  | "step3ImageAlt"
  | "step3Title"
  | "stepsLabel"
  | "stepsTitle"
  | "teamWorkspacesDesc"
  | "teamWorkspacesTitle"
  | "viewDocs",
  string
>;

interface LandingPageProps {
  copy: LandingCopy;
  locale: "en" | "fr";
  labels: {
    docs: string;
    legal: string;
    selectLanguage: string;
    signIn: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
  };
}

export function LandingPage({ copy, labels, locale }: LandingPageProps) {
  const authCta = (
    <Button asChild size="lg" className="gap-2 rounded-full">
      <Link href="/login">
        {copy.getStarted} <ArrowRight aria-hidden="true" className="h-4 w-4" />
      </Link>
    </Button>
  );

  const docsCta = (
    <Button asChild variant="ghost" size="lg" className="rounded-full">
      <Link href="/docs">{copy.viewDocs}</Link>
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="relative isolate min-h-screen">
        <LandingHeader labels={labels} />
        <main>
          <HeroSection authCta={authCta} docsCta={docsCta} />
          <FeaturesSection
            landingTranslations={(key) => copy[key as keyof LandingCopy]}
          />
          <StepsSection
            landingTranslations={(key) => copy[key as keyof LandingCopy]}
          />
        </main>
        <FooterSection
          authCta={authCta}
          copy={copy}
          docsCta={docsCta}
          labels={labels}
          locale={locale}
        />
      </div>
    </div>
  );
}
