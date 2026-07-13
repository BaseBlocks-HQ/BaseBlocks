"use client";

import { Link } from "@/i18n/navigation";
import { Button } from "@baseblocks/ui/button";
import { ArrowRight } from "lucide-react";
import {
  LayoutGroup,
  LazyMotion,
  domMax,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { FeaturesSection } from "./components/features-section";
import { FooterSection } from "./components/footer-section";
import { HeroSection } from "./components/hero-section";
import { IntroOverlay } from "./components/intro-overlay";
import { LandingHeader } from "./components/landing-header";
import { StepsSection } from "./components/steps-section";

type IntroFontVariant =
  | "square"
  | "grid"
  | "triangle"
  | "circle"
  | "sans"
  | "mono";

const introFonts: Record<IntroFontVariant, string> = {
  square: "var(--font-geist-pixel-square)",
  grid: "var(--font-geist-pixel-grid)",
  triangle: "var(--font-geist-pixel-triangle)",
  circle: "var(--font-geist-pixel-circle)",
  sans: "var(--font-geist-sans)",
  mono: "var(--font-geist-mono)",
};

const animationSteps: ReadonlyArray<{
  font: IntroFontVariant;
  size: number;
  amber?: true;
}> = [
  { font: "square", size: 10 },
  { font: "grid", size: 8.2 },
  { font: "sans", size: 6.8, amber: true },
  { font: "triangle", size: 5.5 },
  { font: "mono", size: 4.5 },
  { font: "circle", size: 3.8 },
  { font: "square", size: 3.2, amber: true },
  { font: "square", size: 2.8 },
];

const lastStep = animationSteps.length - 1;
const stepIndices = animationSteps.map((_, index) => index);
const stepSizes = animationSteps.map((step) => step.size);
const morphSpring = { stiffness: 30, damping: 15, mass: 3 } as const;

interface LandingPageProps {
  authenticatedHref: string | null;
}

export function LandingPage({ authenticatedHref }: LandingPageProps) {
  const { resolvedTheme } = useTheme();

  const landingTranslations = useTranslations("landing");
  const commonTranslations = useTranslations("common");
  const navigationTranslations = useTranslations("navigation");

  const isDarkTheme = resolvedTheme === "dark";
  const stepsGridColor = isDarkTheme ? "rgb(229, 229, 229)" : "rgb(23, 23, 23)";
  const stepsGridOpacity = isDarkTheme ? 0.2 : 0.34;

  const titleRef = useRef<HTMLSpanElement>(null);
  const progress = useMotionValue(0);
  const spring = useSpring(progress, morphSpring);
  const [expanded, setExpanded] = useState(false);

  const fontSize = useTransform(spring, stepIndices, stepSizes);
  const fontSizeRem = useTransform(
    fontSize,
    (value) =>
      `clamp(${(value * 0.3).toFixed(2)}rem, ${(value * 3.5).toFixed(2)}vw, ${value}rem)`,
  );

  useMotionValueEvent(spring, "change", (value) => {
    if (!titleRef.current) return;

    const index = Math.max(0, Math.min(Math.round(value), lastStep));
    const currentStep = animationSteps[index];

    if (currentStep) {
      titleRef.current.style.setProperty(
        "font-family",
        introFonts[currentStep.font],
        "important",
      );
      titleRef.current.style.color = currentStep.amber
        ? "var(--color-amber-500)"
        : "";
    }

    if (value >= lastStep - 0.02) {
      setExpanded(true);
    }
  });

  useEffect(() => {
    progress.set(lastStep + 0.1);

    const revealFallback = window.setTimeout(() => {
      setExpanded(true);
    }, 2500);

    return () => window.clearTimeout(revealFallback);
  }, [progress]);

  const authCta = (
    <Link href={authenticatedHref ?? "/login"}>
      <Button size="lg" className="gap-2">
        {authenticatedHref
          ? commonTranslations("goToDashboard")
          : landingTranslations("getStarted")}{" "}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );

  const docsCta = (
    <Link href="/docs">
      <Button
        variant="outline"
        size="lg"
        className="bg-background dark:bg-background dark:hover:bg-accent"
      >
        {landingTranslations("viewDocs")}
      </Button>
    </Link>
  );

  return (
    <LazyMotion features={domMax} strict>
      <div className="h-screen bg-background">
        <LayoutGroup>
          <IntroOverlay
            expanded={expanded}
            titleRef={titleRef}
            fontSizeRem={fontSizeRem}
            brandFontFamily="var(--font-geist-pixel-square)"
          />

          {expanded && (
            <div className="h-full overflow-y-auto">
              <div className="min-h-screen">
                <LandingHeader
                  authenticatedHref={authenticatedHref}
                  commonTranslations={commonTranslations}
                  navigationTranslations={navigationTranslations}
                />
                <HeroSection
                  authCta={authCta}
                  docsCta={docsCta}
                  landingTranslations={landingTranslations}
                />
                <FeaturesSection landingTranslations={landingTranslations} />
                <StepsSection
                  isDarkTheme={isDarkTheme}
                  gridColor={stepsGridColor}
                  gridOpacity={stepsGridOpacity}
                  landingTranslations={landingTranslations}
                />
                <FooterSection
                  authCta={authCta}
                  docsCta={docsCta}
                  landingTranslations={landingTranslations}
                />
              </div>
            </div>
          )}
        </LayoutGroup>
      </div>
    </LazyMotion>
  );
}
