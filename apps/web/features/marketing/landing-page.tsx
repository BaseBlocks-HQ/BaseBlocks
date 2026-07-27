import { ArrowRight } from "lucide-react";
import { FeaturesSection } from "./features-section";
import { FooterSection } from "./footer-section";
import { HeroSection } from "./hero-section";
import { LandingHeader } from "./landing-header";
import { marketingActionClassName } from "./marketing-action";
import { StepsSection } from "./steps-section";

export type LandingCopy = Record<
  | "brandingDesc"
  | "brandingTitle"
  | "ctaTitle"
  | "editorDesc"
  | "editorTitle"
  | "featuresSubtitle"
  | "featuresTitle"
  | "filesSearchDesc"
  | "filesSearchTitle"
  | "footerCookies"
  | "footerCopyright"
  | "footerDocsOverview"
  | "footerDocumentation"
  | "footerLegal"
  | "footerLegalNotice"
  | "footerLegalOverview"
  | "footerQuickStart"
  | "getStarted"
  | "heroDescription"
  | "heroTitle"
  | "pageTreeDesc"
  | "pageTreeTitle"
  | "publishingDesc"
  | "publishingTitle"
  | "step1Desc"
  | "step1Title"
  | "step2Desc"
  | "step2Title"
  | "step3Desc"
  | "step3Title"
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
    selectLanguage: string;
    signIn: string;
    themeDark: string;
    themeLight: string;
    themeSystem: string;
  };
}

export function LandingPage({ copy, labels, locale }: LandingPageProps) {
  const prefix = locale === "fr" ? "/fr" : "";
  const authCta = (
    <a
      className={marketingActionClassName({
        size: "lg",
        variant: "default",
      })}
      href={`${prefix}/login`}
    >
      {copy.getStarted} <ArrowRight aria-hidden="true" className="h-4 w-4" />
    </a>
  );

  return (
    <div className="landing-page min-h-screen bg-background">
      <div className="relative isolate min-h-screen">
        <LandingHeader labels={labels} locale={locale} />
        <main>
          <HeroSection
            authCta={authCta}
            description={copy.heroDescription}
            title={copy.heroTitle}
          />
          <FeaturesSection />
          <StepsSection
            landingTranslations={(key) => copy[key as keyof LandingCopy]}
          />
        </main>
        <FooterSection authCta={authCta} copy={copy} locale={locale} />
      </div>
    </div>
  );
}
