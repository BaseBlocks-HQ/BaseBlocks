"use client";

import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { FlickeringGrid } from "@/components/ui/flickering-grid";
import { Link } from "@/i18n/navigation";
import {
  CustomizeSquarePointerIcon,
  DeployRocketIcon,
  DocumentLibrariesFolderIcon,
  OpenSourceSitemapIcon,
  TeamUsersIcon,
  VisualEditorStackIcon,
} from "@/modules/elements/framework/icons";
import { Button } from "@baseblocks/ui/button";
import { useConvexAuth } from "convex/react";
import {
  ArrowRight,
  Blocks,
  FileText,
  GitFork,
  Github,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  type Transition,
  useMotionValue,
  useMotionValueEvent,
  useSpring,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { type ReactNode, useEffect, useRef, useState } from "react";

// ── Pixel fonts ───────────────────────────────────────────────────────────────

type FontVariant = "square" | "grid" | "triangle" | "circle" | "sans" | "mono";

const FONTS: Record<FontVariant, string> = {
  square: "var(--font-geist-pixel-square)",
  grid: "var(--font-geist-pixel-grid)",
  triangle: "var(--font-geist-pixel-triangle)",
  circle: "var(--font-geist-pixel-circle)",
  sans: "var(--font-geist-sans)",
  mono: "var(--font-geist-mono)",
};

// ── Morph animation config ───────────────────────────────────────────────────
// Same spring mechanics as looskie/website.
// Tighter size range (10→2.8, ~3.6x ratio) so the eye sees the font change
// rather than being distracted by a dramatic size change. Looskie uses 16→3.75
// (4.3x) with Redaction — our Geist Pixel variants are more subtle, so a
// smaller ratio keeps each variant visible longer.

const ANIMATION_STEPS: ReadonlyArray<{ font: FontVariant; size: number; amber?: true }> = [
  { font: "square", size: 10 },
  { font: "grid", size: 8.2 },
  { font: "sans", size: 6.8, amber: true },
  { font: "triangle", size: 5.5 },
  { font: "mono", size: 4.5 },
  { font: "circle", size: 3.8 },
  { font: "square", size: 3.2, amber: true },
  { font: "square", size: 2.8 },
];

const LAST_STEP = ANIMATION_STEPS.length - 1;
const STEP_INDICES = ANIMATION_STEPS.map((_, i) => i);
const STEP_SIZES = ANIMATION_STEPS.map((s) => s.size);

// Same spring as looskie — stiffness:30, damping:15, mass:3
const MORPH_SPRING = { stiffness: 30, damping: 15, mass: 3 } as const;
// Faster spring for the layoutId travel to the header
const LAYOUT_SPRING = { type: "spring", stiffness: 80, damping: 20 } as const satisfies Transition;

// ── Blur-in animation ────────────────────────────────────────────────────────
// Every element that appears after the intro uses this pattern — same as
// looskie's ITEM_ANIMATION. Elements blur-in one by one with staggered delays.

function BlurIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: [0.2, 0.65, 0.3, 0.9], delay }}
    >
      {children}
    </motion.div>
  );
}

// ── Scroll reveal ─────────────────────────────────────────────────────────────

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
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
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `opacity 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                     filter 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s,
                     transform 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function GridPattern() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:35px_34px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
  );
}

// ── Editor mockup ─────────────────────────────────────────────────────────────

function EditorMockup() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-amber-500/8 blur-3xl dark:bg-amber-400/[0.05]" />
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-xl dark:border-white/[0.08]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3 dark:border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-400/80" />
            <div className="h-3 w-3 rounded-full bg-amber-400/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
          <span
            className="ml-2 text-[11px] text-muted-foreground/60"
            style={{ fontFamily: FONTS.square }}
          >
            BaseBlocks Editor
          </span>
        </div>

        {/* Body */}
        <div className="flex" style={{ height: "clamp(220px, 32vw, 380px)" }}>
          {/* Sidebar */}
          <div className="hidden w-40 shrink-0 border-r border-border/40 bg-muted/30 p-3 sm:block dark:border-white/[0.05]">
            <div
              className="mb-2.5 text-[10px] uppercase tracking-widest text-muted-foreground/40"
              style={{ fontFamily: FONTS.triangle }}
            >
              Pages
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-amber-500/[0.08]">
                <div className="h-2 w-2 rounded-sm bg-amber-500/60" />
                Home
              </div>
              {["Getting Started", "API Reference", "Team Guide"].map((page) => (
                <div
                  key={page}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground"
                >
                  <div className="h-2 w-2 rounded-sm bg-muted-foreground/15" />
                  {page}
                </div>
              ))}
            </div>
            <div
              className="mb-2.5 mt-5 text-[10px] uppercase tracking-widest text-muted-foreground/40"
              style={{ fontFamily: FONTS.triangle }}
            >
              Components
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
                <Blocks className="h-3 w-3 opacity-40" />
                Layouts
              </div>
              <div className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground">
                <FileText className="h-3 w-3 opacity-40" />
                Blocks
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 overflow-hidden p-4 sm:p-5">
            <div className="mb-3 rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
              <div className="text-sm font-semibold">Welcome to Acme</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Your team&apos;s knowledge base and documentation hub
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div className="rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
                <div className="mb-2 h-12 w-full rounded bg-gradient-to-br from-amber-500/12 via-amber-400/5 to-transparent sm:h-16" />
                <div className="h-2 w-3/4 rounded bg-muted-foreground/8" />
                <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/8" />
              </div>
              <div className="rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
                <div className="mb-2 text-xs font-medium">Quick Links</div>
                <div className="space-y-1.5">
                  {[100, 83, 66, 75].map((w) => (
                    <div
                      key={w}
                      className="h-2 rounded bg-muted-foreground/8"
                      style={{ width: `${w}%` }}
                    />
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
  {
    icon: VisualEditorStackIcon,
    titleKey: "visualEditorTitle",
    descKey: "visualEditorDesc",
    num: "01",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: DeployRocketIcon,
    titleKey: "draftDeployTitle",
    descKey: "draftDeployDesc",
    num: "02",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: DocumentLibrariesFolderIcon,
    titleKey: "documentLibrariesTitle",
    descKey: "documentLibrariesDesc",
    num: "03",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: TeamUsersIcon,
    titleKey: "teamWorkspacesTitle",
    descKey: "teamWorkspacesDesc",
    num: "04",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: CustomizeSquarePointerIcon,
    titleKey: "customThemesTitle",
    descKey: "customThemesDesc",
    num: "05",
    iconClassName: "group-hover:scale-110",
  },
  {
    icon: OpenSourceSitemapIcon,
    titleKey: "openSourceTitle",
    descKey: "openSourceDesc",
    num: "06",
    iconClassName:
      "[transform:scaleY(-1)] group-hover:[transform:scaleY(-1)_scale(1.1)]",
  },
] as const;

const steps = [
  { num: "01", titleKey: "step1Title", descKey: "step1Desc" },
  { num: "02", titleKey: "step2Title", descKey: "step2Desc" },
  { num: "03", titleKey: "step3Title", descKey: "step3Desc" },
] as const;

// ── Landing page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { resolvedTheme } = useTheme();
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const tn = useTranslations("navigation");
  const isDarkTheme = resolvedTheme === "dark";
  const howItWorksGridColor = isDarkTheme ? "rgb(229, 229, 229)" : "rgb(23, 23, 23)";
  const howItWorksGridOpacity = isDarkTheme ? 0.2 : 0.34;

  const titleRef = useRef<HTMLSpanElement>(null);
  const progress = useMotionValue(0);
  const spring = useSpring(progress, MORPH_SPRING);
  const [expanded, setExpanded] = useState(false);

  const fontSize = useTransform(spring, STEP_INDICES, STEP_SIZES);
  // Same clamp formula as looskie — v*0.3 for min, v*3.5 for vw, v for max
  const fontSizeRem = useTransform(
    fontSize,
    (v) => `clamp(${(v * 0.3).toFixed(2)}rem, ${(v * 3.5).toFixed(2)}vw, ${v}rem)`,
  );

  useMotionValueEvent(spring, "change", (v) => {
    if (!titleRef.current) return;
    const i = Math.max(0, Math.min(Math.round(v), LAST_STEP));
    const step = ANIMATION_STEPS[i];
    if (step) {
      titleRef.current.style.setProperty("font-family", FONTS[step.font], "important");
      titleRef.current.style.color = step.amber ? "var(--color-amber-500)" : "";
    }
    if (v > LAST_STEP) setExpanded(true);
  });

  useEffect(() => {
    progress.set(LAST_STEP);
  }, [progress]);

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
    <div className={expanded ? "min-h-screen bg-background" : "h-screen overflow-hidden bg-background"}>
      <LayoutGroup>
        {/* ── Intro ── */}
        <AnimatePresence>
          {!expanded && (
            <motion.div
              key="intro"
              className="fixed inset-0 z-50 flex items-center justify-center bg-background"
              exit={{ opacity: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
            >
              <motion.span
                layoutId="brand"
                ref={titleRef}
                className="whitespace-nowrap will-change-transform"
                style={{
                  fontSize: fontSizeRem,
                  fontFamily: FONTS.square,
                  lineHeight: 1,
                  userSelect: "none",
                }}
              >
                BaseBlocks
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header + Page ── */}
        {expanded && (
          <>
            {/* Header — elements blur in with stagger */}
            <header className="sticky top-0 z-50">
              <div className="bg-background/85 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                  <div className="flex items-center gap-2.5">
                    <motion.div
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm text-background"
                      style={{ fontFamily: FONTS.square }}
                      initial={{ opacity: 0, scale: 0.7, filter: "blur(4px)" }}
                      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9] }}
                    >
                      B
                    </motion.div>
                    <motion.span
                      layoutId="brand"
                      transition={LAYOUT_SPRING}
                      className="whitespace-nowrap tracking-tight"
                      style={{ fontFamily: FONTS.square, fontSize: "0.9375rem", lineHeight: 1 }}
                    >
                      BaseBlocks
                    </motion.span>
                  </div>

                  <motion.div
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, y: 5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 1, ease: [0.2, 0.65, 0.3, 0.9], delay: 0.15 }}
                  >
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
                      <Button variant="outline" size="sm" disabled>
                        {tc("loading")}
                      </Button>
                    ) : isAuthenticated ? (
                      <Link href="/dashboard">
                        <Button size="sm">{tn("dashboard")}</Button>
                      </Link>
                    ) : (
                      <Link href="/login">
                        <Button size="sm">{tc("signIn")}</Button>
                      </Link>
                    )}
                  </motion.div>
                </div>
              </div>
              <motion.div
                className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent dark:via-white/[0.06]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              />
            </header>

            {/* ── Hero ── */}
            <section className="relative z-10 overflow-hidden px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
              <GridPattern />
              <div className="relative z-10 mx-auto max-w-6xl">
                <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
                  {/* Left — copy, each group blurs in sequentially */}
                  <div>
                    <BlurIn delay={0.1}>
                      <div
                        className="mb-7 inline-flex items-center gap-2 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-[11px] tracking-wide text-amber-700 dark:border-amber-400/25 dark:text-amber-400"
                        style={{ fontFamily: FONTS.square }}
                      >
                        <GitFork className="h-3 w-3" />
                        {t("badge")}
                      </div>
                    </BlurIn>

                    <BlurIn delay={0.2}>
                      <h1
                        className="leading-[0.98] tracking-tight"
                        style={{ fontSize: "clamp(2.8rem, 5.5vw, 4.8rem)" }}
                        aria-label="Build sites your team will actually use."
                      >
                        <span className="block" style={{ fontFamily: FONTS.grid }}>
                          BUILD SITES
                        </span>
                        <span className="block" style={{ fontFamily: FONTS.grid }}>
                          YOUR TEAM WILL
                        </span>
                        <span className="block">
                          <span
                            className="text-amber-500 dark:text-amber-400"
                            style={{ fontFamily: FONTS.square }}
                          >
                            ACTUALLY
                          </span>
                          <span style={{ fontFamily: FONTS.grid }}> USE.</span>
                        </span>
                      </h1>
                    </BlurIn>

                    <BlurIn delay={0.4}>
                      <p className="mt-7 max-w-sm text-[0.94rem] leading-relaxed text-muted-foreground lg:max-w-[22rem]">
                        {t("heroSubtitle")}
                      </p>
                    </BlurIn>

                    <BlurIn delay={0.55}>
                      <div className="mt-8 flex flex-wrap gap-3">
                        {isLoading ? (
                          <Button size="lg" disabled>
                            {tc("loading")}
                          </Button>
                        ) : (
                          authCta
                        )}
                        <a
                          href="https://github.com/naaiyy/BaseBlocks"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="lg" className="gap-2">
                            <Github className="h-4 w-4" />
                            {t("viewOnGithub")}
                          </Button>
                        </a>
                      </div>
                    </BlurIn>
                  </div>

                  {/* Right — editor mockup */}
                  <BlurIn delay={0.35} className="relative">
                    <EditorMockup />
                  </BlurIn>
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
                  <div className="max-w-xl">
                    <div
                      className="mb-4 text-xs tracking-[0.22em] text-amber-600 dark:text-amber-400"
                      style={{ fontFamily: FONTS.triangle }}
                    >
                      {t("featuresLabel").toUpperCase()}
                    </div>
                    <h2
                      className="text-3xl tracking-tight sm:text-4xl"
                      style={{ fontFamily: FONTS.grid }}
                    >
                      {t("featuresTitle")}
                    </h2>
                    <p className="mt-4 text-[0.94rem] leading-relaxed text-muted-foreground">
                      {t("featuresSubtitle")}
                    </p>
                  </div>
                </Reveal>

                <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {features.map((feat, i) => (
                    <Reveal key={feat.titleKey} delay={0.06 * i}>
                      <div className="group relative isolate h-full overflow-hidden rounded-xl border border-border/70 bg-background/95 p-6 shadow-sm shadow-black/[0.04] transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/[0.04] dark:border-white/[0.06] dark:bg-white/[0.02] dark:shadow-none dark:hover:border-amber-400/20">
                        <feat.icon
                          className={`absolute right-[-16px] bottom-[-16px] z-0 h-28 w-28 opacity-[0.58] transition-transform duration-300 dark:opacity-35 ${feat.iconClassName}`}
                        />
                        <div
                          className="relative z-10 mb-3 text-[11px] text-muted-foreground/40"
                          style={{ fontFamily: FONTS.circle }}
                        >
                          {feat.num}
                        </div>
                        <h3 className="relative z-10 text-[0.94rem] font-semibold">{t(feat.titleKey)}</h3>
                        <p className="relative z-10 mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {t(feat.descKey)}
                        </p>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            {/* ── How it works ── */}
            <section
              id="how-it-works"
              className="relative scroll-mt-20 overflow-hidden border-t border-border/40 px-6 py-24 sm:py-32 dark:border-white/[0.04]"
            >
              <FlickeringGrid
                className="absolute inset-0 z-0"
                color={howItWorksGridColor}
                squareSize={4}
                gridGap={8}
                maxOpacity={howItWorksGridOpacity}
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
                      style={{ fontFamily: FONTS.triangle }}
                    >
                      {t("stepsLabel").toUpperCase()}
                    </div>
                    <h2
                      className="text-3xl tracking-tight sm:text-4xl"
                      style={{ fontFamily: FONTS.grid }}
                    >
                      {t("stepsTitle")}
                    </h2>
                  </div>
                </Reveal>

                <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-8">
                  {steps.map((step, i) => (
                    <Reveal key={step.titleKey} delay={0.1 * i}>
                      <div className="relative">
                        <div
                          className="relative z-20 mb-4 text-7xl text-amber-600 dark:text-amber-400 sm:text-8xl"
                          style={{ fontFamily: FONTS.circle, lineHeight: 1 }}
                        >
                          {step.num}
                        </div>
                        <h3 className="text-[0.94rem] font-semibold">{t(step.titleKey)}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                          {t(step.descKey)}
                        </p>
                        {i < steps.length - 1 && (
                          <div
                            className="pointer-events-none absolute top-9 right-0 z-20 hidden translate-x-1/2 text-xs tracking-widest text-amber-600 dark:text-amber-400 sm:block"
                            style={{ fontFamily: FONTS.square }}
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
                  <div className="py-24 sm:py-32">
                    <h2
                      className="max-w-xl text-3xl tracking-tight sm:text-4xl"
                      style={{ fontFamily: FONTS.grid }}
                    >
                      {t("ctaTitle")}
                    </h2>
                    <p className="mt-4 max-w-sm text-[0.94rem] text-muted-foreground">
                      {t("ctaSubtitle")}
                    </p>
                    <div className="mt-8">
                      {isLoading ? (
                        <Button size="lg" disabled>
                          {tc("loading")}
                        </Button>
                      ) : (
                        authCta
                      )}
                    </div>
                  </div>
                </Reveal>

                <div className="border-t border-border/40 py-6 dark:border-white/[0.04]">
                  <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[10px] text-background"
                        style={{ fontFamily: FONTS.square }}
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
          </>
        )}
      </LayoutGroup>
    </div>
  );
}
