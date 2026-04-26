"use client";

import { Link } from "@/i18n/navigation";
import { useHaptic } from "@/lib/use-haptic";
import {
  animationSteps,
  landingFonts,
  lastStep,
  morphSpring,
  stepIndices,
  stepSizes,
} from "@/modules/landing/constants";
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
import { ScrollArea } from "@baseblocks/ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { FeaturesSection } from "./components/features-section";
import { FooterSection } from "./components/footer-section";
import { HeroSection } from "./components/hero-section";
import { IntroOverlay } from "./components/intro-overlay";
import { LandingHeader } from "./components/landing-header";
import { StepsSection } from "./components/steps-section";

interface LandingPageProps {
  isAuthenticated: boolean;
}

export function LandingPage({ isAuthenticated }: LandingPageProps) {
  const { resolvedTheme } = useTheme();

  const landingTranslations = useTranslations("landing");
  const commonTranslations = useTranslations("common");
  const navigationTranslations = useTranslations("navigation");

  const isDarkTheme = resolvedTheme === "dark";
  const stepsGridColor = isDarkTheme ? "rgb(229, 229, 229)" : "rgb(23, 23, 23)";
  const stepsGridOpacity = isDarkTheme ? 0.2 : 0.34;

  const haptic = useHaptic();
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
        landingFonts[currentStep.font],
        "important",
      );
      titleRef.current.style.color = currentStep.amber
        ? "var(--color-amber-500)"
        : "";
    }

    if (value > lastStep) {
      setExpanded(true);
    }
  });

  useEffect(() => {
    progress.set(lastStep);
  }, [progress]);

  const authCta = isAuthenticated ? (
    <Link href="/dashboard">
      <Button
        size="lg"
        className="gap-2"
        onClick={() => haptic.trigger("heavy")}
      >
        {commonTranslations("goToDashboard")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button
        size="lg"
        className="gap-2"
        onClick={() => haptic.trigger("heavy")}
      >
        {landingTranslations("getStarted")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );

  const docsCta = (
    <Link href="/docs">
      <Button
        variant="outline"
        size="lg"
        className="bg-background dark:bg-background dark:hover:bg-accent"
        onClick={() => haptic.trigger("heavy")}
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
            brandFontFamily={landingFonts.square}
          />

          {expanded && (
            <ScrollArea className="h-full">
              <div className="min-h-screen">
                <LandingHeader
                  isAuthenticated={isAuthenticated}
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
            </ScrollArea>
          )}
        </LayoutGroup>
      </div>
    </LazyMotion>
  );
}
