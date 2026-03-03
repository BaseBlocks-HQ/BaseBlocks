"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Link } from "@/i18n/navigation";
import { Button } from "@baseblocks/ui/button";
import { useConvexAuth } from "convex/react";
import {
  ArrowRight,
  Blocks,
  FileText,
  GitFork,
  Github,
  Layers,
  Paintbrush,
  Rocket,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";

// ── Pixel font map ────────────────────────────────────────────────────────────

type PixelVariant = "square" | "grid" | "triangle" | "circle";

const PIXEL_FONTS: Record<PixelVariant, string> = {
  square:   "var(--font-geist-pixel-square)",
  grid:     "var(--font-geist-pixel-grid)",
  triangle: "var(--font-geist-pixel-triangle)",
  circle:   "var(--font-geist-pixel-circle)",
};

// ── Intro animation ───────────────────────────────────────────────────────────
// "BaseBlocks" starts large and centered. The font-family snaps through all four
// Geist Pixel fill variants (solid → outlined → triangles → circles…) at each step
// while font-size transitions smoothly downward — same mechanics as looskie's
// Redaction morph, adapted for our pixel variant system.
// When it settles, the overlay fades out and the page content is revealed.

const INTRO_STEPS: Array<{ variant: PixelVariant; size: string }> = [
  { variant: "square",   size: "clamp(3rem, 10vw, 7rem)" },
  { variant: "grid",     size: "clamp(2.6rem, 8.5vw, 6rem)" },
  { variant: "triangle", size: "clamp(2.2rem, 7vw, 5rem)" },
  { variant: "circle",   size: "clamp(1.9rem, 6vw, 4.2rem)" },
  { variant: "grid",     size: "clamp(1.6rem, 5vw, 3.5rem)" },
  { variant: "triangle", size: "clamp(1.4rem, 4vw, 3rem)" },
  { variant: "square",   size: "clamp(1.2rem, 3.5vw, 2.5rem)" },
];

const STEP_INTERVAL = 130; // ms between each font snap

function IntroAnimation({ onComplete }: { onComplete: () => void }) {
  // Stable ref so the scheduled timeout always calls the latest version
  // even if the parent re-renders before it fires.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [stepIndex, setStepIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Schedule each font snap
    INTRO_STEPS.forEach((_, i) => {
      if (i === 0) return;
      timers.push(setTimeout(() => setStepIndex(i), 120 + i * STEP_INTERVAL));
    });

    // After the last step, hold briefly then fade out
    // last step fires at: 120 + (len-1)*130 = 120 + 780 = 900ms
    const fadeAt = 120 + (INTRO_STEPS.length - 1) * STEP_INTERVAL + 220;
    timers.push(setTimeout(() => setFading(true), fadeAt));
    timers.push(setTimeout(() => onCompleteRef.current(), fadeAt + 600));

    return () => timers.forEach(clearTimeout);
  }, []); // intentionally empty — runs once on mount

  const step = INTRO_STEPS[stepIndex]!;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background"
      style={{
        opacity: fading ? 0 : 1,
        transition: "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <span
        style={{
          fontFamily: PIXEL_FONTS[step.variant],
          fontSize: step.size,
          // Size animates smoothly; font-family snaps instantly at each step
          transition: "font-size 0.13s cubic-bezier(0.16, 1, 0.3, 1)",
          lineHeight: 1,
          userSelect: "none",
        }}
      >
        BaseBlocks
      </span>
    </div>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        filter: visible ? "blur(0px)" : "blur(8px)",
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                     filter 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                     transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── Editor mockup ─────────────────────────────────────────────────────────────

function EditorMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="pointer-events-none absolute -inset-12 rounded-3xl bg-amber-500/10 blur-3xl dark:bg-amber-400/[0.06]" />

      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl dark:border-white/[0.08]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3 dark:border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-400/80" />
            <div className="h-3 w-3 rounded-full bg-amber-400/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="ml-2 text-[11px] text-muted-foreground/70" style={{ fontFamily: PIXEL_FONTS.square }}>
            BaseBlocks Editor
          </span>
        </div>

        {/* Body */}
        <div className="flex" style={{ height: "clamp(240px, 38vw, 400px)" }}>
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border/40 bg-muted/30 p-3 sm:block dark:border-white/[0.05]">
            <div className="mb-2.5 text-[10px] uppercase tracking-widest text-muted-foreground/45" style={{ fontFamily: PIXEL_FONTS.triangle }}>
              Pages
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-amber-500/[0.08]">
                <div className="h-2 w-2 rounded-sm bg-amber-500/60" />
                Home
              </div>
              {["Getting Started", "API Reference", "Team Guide"].map(page => (
                <div key={page} className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-sm bg-muted-foreground/15" />
                  {page}
                </div>
              ))}
            </div>
            <div className="mb-2.5 mt-6 text-[10px] uppercase tracking-widest text-muted-foreground/45" style={{ fontFamily: PIXEL_FONTS.triangle }}>
              Components
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
                <Blocks className="h-3 w-3 opacity-50" />
                Layouts
              </div>
              <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 opacity-50" />
                Blocks
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-hidden p-4 sm:p-6">
            <div className="mb-4 rounded-lg border border-dashed border-border/50 p-4 dark:border-white/[0.06]">
              <div className="text-base font-semibold sm:text-lg">Welcome to Acme</div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Your team&apos;s knowledge base and documentation hub
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
                <div className="mb-2 h-14 w-full rounded bg-gradient-to-br from-amber-500/12 via-amber-400/5 to-transparent sm:h-20" />
                <div className="h-2 w-3/4 rounded bg-muted-foreground/8" />
                <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/8" />
              </div>
              <div className="rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
                <div className="mb-2.5 text-xs font-medium">Quick Links</div>
                <div className="space-y-1.5">
                  {[100, 83, 66, 75].map((w, i) => (
                    <div key={i} className="h-2 rounded bg-muted-foreground/8" style={{ width: `${w}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const features = [
  { icon: Layers,     titleKey: "visualEditorTitle",     descKey: "visualEditorDesc",     num: "01" },
  { icon: Rocket,     titleKey: "draftDeployTitle",       descKey: "draftDeployDesc",       num: "02" },
  { icon: FileText,   titleKey: "documentLibrariesTitle", descKey: "documentLibrariesDesc", num: "03" },
  { icon: Users,      titleKey: "teamWorkspacesTitle",    descKey: "teamWorkspacesDesc",    num: "04" },
  { icon: Paintbrush, titleKey: "customThemesTitle",      descKey: "customThemesDesc",      num: "05" },
  { icon: GitFork,    titleKey: "openSourceTitle",        descKey: "openSourceDesc",        num: "06" },
] as const;

const steps = [
  { num: "01", titleKey: "step1Title", descKey: "step1Desc" },
  { num: "02", titleKey: "step2Title", descKey: "step2Desc" },
  { num: "03", titleKey: "step3Title", descKey: "step3Desc" },
] as const;

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const tn = useTranslations("navigation");

  // showIntro: keeps the overlay in the DOM during its fade-out
  // pageVisible: triggers the content fade-in (starts simultaneously with intro fade-out)
  const [showIntro, setShowIntro] = useState(true);
  const [pageVisible, setPageVisible] = useState(false);

  const handleIntroComplete = () => {
    setPageVisible(true);
    // Remove overlay from DOM only after its CSS transition finishes
    setTimeout(() => setShowIntro(false), 650);
  };

  const authCta = isAuthenticated ? (
    <Link href="/dashboard">
      <Button size="lg" className="gap-2">
        {tc("goToDashboard")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button size="lg" className="gap-2">
        {t("getStarted")} <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Intro overlay — covers the page until the morph animation completes */}
      {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

      {/* Page content — fades in as the intro fades out */}
      <div
        style={{
          opacity: pageVisible ? 1 : 0,
          transition: "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* ── Header ── */}
        <header className="sticky top-0 z-50">
          <div className="bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
              <a href="/" className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm text-background"
                  style={{ fontFamily: PIXEL_FONTS.square }}
                >
                  B
                </div>
                <span className="text-[15px] tracking-tight" style={{ fontFamily: PIXEL_FONTS.square }}>
                  BaseBlocks
                </span>
              </a>

              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/naaiyy/BaseBlocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex sm:items-center sm:gap-1.5"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
                <div className="flex items-center gap-0.5">
                  <LanguageSwitcher />
                  <ModeToggle />
                </div>
                {isLoading ? (
                  <Button variant="outline" size="sm" disabled>{tc("loading")}</Button>
                ) : isAuthenticated ? (
                  <Link href="/dashboard"><Button size="sm">{tn("dashboard")}</Button></Link>
                ) : (
                  <Link href="/login"><Button size="sm">{tc("signIn")}</Button></Link>
                )}
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent dark:via-white/[0.06]" />
        </header>

        {/* ── Hero ── */}
        <section className="px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-4xl text-center">

              {/* Badge */}
              <div
                className="mb-8 inline-flex items-center gap-2 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-[11px] tracking-wide text-amber-700 dark:border-amber-400/25 dark:text-amber-400"
                style={{ fontFamily: PIXEL_FONTS.square }}
              >
                <GitFork className="h-3 w-3" />
                {t("badge")}
              </div>

              {/* Hero headline
                  Grid variant = open outlined fill (airy, background words)
                  Square variant on ACTUALLY = solid fill (punches forward in amber)
                  No entry animation — the intro sequence WAS the animation */}
              <h1
                className="mb-6 leading-[1.02] tracking-tight"
                style={{ fontSize: "clamp(2.6rem, 8vw, 6rem)" }}
                aria-label="Build internal sites your team will actually use."
              >
                <div style={{ fontFamily: PIXEL_FONTS.grid }}>BUILD INTERNAL</div>
                <div style={{ fontFamily: PIXEL_FONTS.grid }}>SITES YOUR TEAM</div>
                <div>
                  <span style={{ fontFamily: PIXEL_FONTS.grid }}>WILL </span>
                  <span
                    className="text-amber-500 dark:text-amber-400"
                    style={{ fontFamily: PIXEL_FONTS.square }}
                  >
                    ACTUALLY
                  </span>
                  <span style={{ fontFamily: PIXEL_FONTS.grid }}> USE.</span>
                </div>
              </h1>

              {/* Subtitle */}
              <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[1.075rem]">
                {t("heroSubtitle")}
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                {isLoading ? (
                  <Button size="lg" disabled>{tc("loading")}</Button>
                ) : authCta}
                <a href="https://github.com/naaiyy/BaseBlocks" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Github className="h-4 w-4" />
                    {t("viewOnGithub")}
                  </Button>
                </a>
              </div>
            </div>

            {/* Editor mockup */}
            <div className="mt-16 sm:mt-20">
              <EditorMockup />
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section
          id="features"
          className="scroll-mt-20 border-t border-border/40 bg-muted/20 px-6 py-24 sm:py-32 dark:border-white/[0.04] dark:bg-white/[0.015]"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <div
                  className="mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400"
                  style={{ fontFamily: PIXEL_FONTS.triangle }}
                >
                  {t("featuresLabel").toUpperCase()}
                </div>
                <h2 className="text-3xl tracking-tight sm:text-4xl" style={{ fontFamily: PIXEL_FONTS.grid }}>
                  {t("featuresTitle")}
                </h2>
                <p className="mt-4 text-[0.94rem] leading-relaxed text-muted-foreground">
                  {t("featuresSubtitle")}
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feat, i) => (
                <Reveal key={feat.titleKey} delay={0.07 * i}>
                  <div className="group relative h-full overflow-hidden rounded-xl border border-border/50 bg-background/70 p-6 transition-all duration-300 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/[0.04] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-amber-400/20">
                    <div
                      className="mb-3 text-[11px] text-muted-foreground/30"
                      style={{ fontFamily: PIXEL_FONTS.circle }}
                    >
                      {feat.num}
                    </div>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/[0.08] dark:text-amber-400">
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[0.94rem] font-semibold">{t(feat.titleKey)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(feat.descKey)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section
          id="how-it-works"
          className="scroll-mt-20 border-t border-border/40 px-6 py-24 sm:py-32 dark:border-white/[0.04]"
        >
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <div
                  className="mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400"
                  style={{ fontFamily: PIXEL_FONTS.triangle }}
                >
                  {t("stepsLabel").toUpperCase()}
                </div>
                <h2 className="text-3xl tracking-tight sm:text-4xl" style={{ fontFamily: PIXEL_FONTS.grid }}>
                  {t("stepsTitle")}
                </h2>
              </div>
            </Reveal>

            <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {steps.map((step, i) => (
                <Reveal key={step.titleKey} delay={0.12 * i}>
                  <div className="relative text-center">
                    <div
                      className="mb-4 text-7xl text-amber-500/15 dark:text-amber-400/10 sm:text-8xl"
                      style={{ fontFamily: PIXEL_FONTS.circle, lineHeight: 1 }}
                    >
                      {step.num}
                    </div>
                    <h3 className="text-[0.94rem] font-semibold">{t(step.titleKey)}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t(step.descKey)}</p>
                    {i < steps.length - 1 && (
                      <div
                        className="pointer-events-none absolute top-9 right-0 hidden translate-x-1/2 text-xs tracking-widest text-muted-foreground/20 sm:block"
                        style={{ fontFamily: PIXEL_FONTS.square }}
                      >
                        →
                      </div>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA + Footer ── */}
        <footer className="border-t border-border/40 bg-muted/20 px-6 dark:border-white/[0.04] dark:bg-white/[0.015]">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto max-w-2xl py-24 text-center sm:py-32">
                <h2 className="text-3xl tracking-tight sm:text-4xl" style={{ fontFamily: PIXEL_FONTS.grid }}>
                  {t("ctaTitle")}
                </h2>
                <p className="mt-4 text-[0.94rem] text-muted-foreground">{t("ctaSubtitle")}</p>
                <div className="mt-8">
                  {isLoading ? <Button size="lg" disabled>{tc("loading")}</Button> : authCta}
                </div>
              </div>
            </Reveal>

            <div className="border-t border-border/40 py-6 dark:border-white/[0.04]">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[10px] text-background"
                    style={{ fontFamily: PIXEL_FONTS.square }}
                  >
                    B
                  </div>
                  <span className="text-xs text-muted-foreground/60">{t("footerCopyright")}</span>
                </div>
                <a
                  href="https://github.com/naaiyy/BaseBlocks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Github className="h-3.5 w-3.5" />
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
