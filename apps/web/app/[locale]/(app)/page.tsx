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
import { Instrument_Serif } from "next/font/google";
import { useTranslations } from "next-intl";
import { type ReactNode, useEffect, useRef, useState } from "react";

const serif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

// ── Scroll-triggered reveal ─────────────────────────────────────────────────

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
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.12 },
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
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

// ── Editor mockup ───────────────────────────────────────────────────────────

function EditorMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      {/* Ambient glow */}
      <div className="absolute -inset-10 rounded-3xl bg-amber-500/8 blur-3xl dark:bg-amber-400/[0.04]" />

      {/* Window frame */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xl dark:border-white/[0.08]">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/50 px-4 py-3 dark:border-white/[0.06]">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-rose-400/80" />
            <div className="h-3 w-3 rounded-full bg-amber-400/80" />
            <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="ml-2 text-xs text-muted-foreground/70">
            BaseBlocks Editor
          </span>
        </div>

        {/* Editor body */}
        <div
          className="flex"
          style={{ height: "clamp(240px, 38vw, 400px)" }}
        >
          {/* Sidebar */}
          <div className="hidden w-44 shrink-0 border-r border-border/40 bg-muted/30 p-3 sm:block dark:border-white/[0.05]">
            <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Pages
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-2.5 py-1.5 text-xs font-medium text-foreground dark:bg-amber-500/[0.08]">
                <div className="h-2 w-2 rounded-sm bg-amber-500/50" />
                Home
              </div>
              {["Getting Started", "API Reference", "Team Guide"].map(
                (page) => (
                  <div
                    key={page}
                    className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground"
                  >
                    <div className="h-2 w-2 rounded-sm bg-muted-foreground/15" />
                    {page}
                  </div>
                ),
              )}
            </div>

            <div className="mb-2.5 mt-6 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
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
            {/* Heading block */}
            <div className="mb-4 rounded-lg border border-dashed border-border/50 p-4 transition-colors dark:border-white/[0.06]">
              <div className="text-base font-semibold sm:text-lg">
                Welcome to Acme
              </div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Your team&apos;s knowledge base and documentation hub
              </div>
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
                <div className="mb-2 h-14 w-full rounded bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent sm:h-20" />
                <div className="h-2 w-3/4 rounded bg-muted-foreground/8" />
                <div className="mt-1.5 h-2 w-1/2 rounded bg-muted-foreground/8" />
              </div>
              <div className="rounded-lg border border-dashed border-border/50 p-3 dark:border-white/[0.06]">
                <div className="mb-2.5 text-xs font-medium">Quick Links</div>
                <div className="space-y-1.5">
                  <div className="h-2 w-full rounded bg-muted-foreground/8" />
                  <div className="h-2 w-5/6 rounded bg-muted-foreground/8" />
                  <div className="h-2 w-4/6 rounded bg-muted-foreground/8" />
                  <div className="h-2 w-3/4 rounded bg-muted-foreground/8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Feature data ────────────────────────────────────────────────────────────

const features = [
  { icon: Layers, titleKey: "visualEditorTitle", descKey: "visualEditorDesc" },
  { icon: Rocket, titleKey: "draftDeployTitle", descKey: "draftDeployDesc" },
  {
    icon: FileText,
    titleKey: "documentLibrariesTitle",
    descKey: "documentLibrariesDesc",
  },
  { icon: Users, titleKey: "teamWorkspacesTitle", descKey: "teamWorkspacesDesc" },
  {
    icon: Paintbrush,
    titleKey: "customThemesTitle",
    descKey: "customThemesDesc",
  },
  { icon: GitFork, titleKey: "openSourceTitle", descKey: "openSourceDesc" },
] as const;

const steps = [
  { num: "01", titleKey: "step1Title", descKey: "step1Desc" },
  { num: "02", titleKey: "step2Title", descKey: "step2Desc" },
  { num: "03", titleKey: "step3Title", descKey: "step3Desc" },
] as const;

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const t = useTranslations("landing");
  const tc = useTranslations("common");
  const tn = useTranslations("navigation");

  const authCta = isAuthenticated ? (
    <Link href="/dashboard">
      <Button size="lg" className="gap-2">
        {tc("goToDashboard")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  ) : (
    <Link href="/login">
      <Button size="lg" className="gap-2">
        {t("getStarted")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Dot grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.35] dark:opacity-[0.15]"
        style={{
          backgroundImage:
            "radial-gradient(circle, oklch(0.4 0 0 / 0.12) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative">
        {/* ── Header ── */}
        <header className="sticky top-0 z-50">
          <div className="bg-background/85 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
              <a href="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-sm font-bold text-background">
                  B
                </div>
                <span className="text-base font-semibold tracking-tight">
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
              </div>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent dark:via-white/[0.06]" />
        </header>

        {/* ── Hero ── */}
        <section className="px-6 pt-20 pb-12 sm:pt-28 sm:pb-16">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/40 px-3.5 py-1.5 text-xs text-muted-foreground dark:border-white/[0.06]">
                  <GitFork className="h-3 w-3" />
                  {t("badge")}
                </div>

                <h1
                  className={`${serif.className} text-[2.5rem] leading-[1.08] tracking-tight sm:text-5xl md:text-6xl lg:text-[4.25rem]`}
                >
                  {t("heroTitle")}
                </h1>

                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-[1.075rem]">
                  {t("heroSubtitle")}
                </p>

                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="mt-16 sm:mt-20">
                <EditorMockup />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="scroll-mt-20 border-t border-border/40 bg-muted/20 px-6 py-24 sm:py-32 dark:border-white/[0.04] dark:bg-white/[0.015]">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                  {t("featuresLabel")}
                </div>
                <h2
                  className={`${serif.className} text-3xl tracking-tight sm:text-4xl`}
                >
                  {t("featuresTitle")}
                </h2>
                <p className="mt-3 text-[0.94rem] leading-relaxed text-muted-foreground">
                  {t("featuresSubtitle")}
                </p>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feat, i) => (
                <Reveal key={feat.titleKey} delay={0.06 * i}>
                  <div className="group h-full rounded-xl border border-border/50 bg-background/70 p-6 transition-all duration-300 hover:border-amber-500/25 hover:shadow-lg hover:shadow-amber-500/[0.04] dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-amber-400/20">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/[0.08] dark:text-amber-400">
                      <feat.icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-[0.94rem] font-semibold">
                      {t(feat.titleKey)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {t(feat.descKey)}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how-it-works" className="scroll-mt-20 border-t border-border/40 px-6 py-24 sm:py-32 dark:border-white/[0.04]">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mx-auto max-w-2xl text-center">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-amber-600 dark:text-amber-400">
                  {t("stepsLabel")}
                </div>
                <h2
                  className={`${serif.className} text-3xl tracking-tight sm:text-4xl`}
                >
                  {t("stepsTitle")}
                </h2>
              </div>
            </Reveal>

            <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-6">
              {steps.map((step, i) => (
                <Reveal key={step.titleKey} delay={0.1 * i}>
                  <div className="text-center">
                    <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-border/60 font-mono text-sm font-semibold text-muted-foreground dark:border-white/[0.08]">
                      {step.num}
                    </div>
                    <h3 className="text-[0.94rem] font-semibold">
                      {t(step.titleKey)}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {t(step.descKey)}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA + Footer ── */}
        <footer className="border-t border-border/40 bg-muted/20 px-6 dark:border-white/[0.04] dark:bg-white/[0.015]">
          <div className="mx-auto max-w-6xl">
            {/* CTA */}
            <Reveal>
              <div className="mx-auto max-w-2xl py-24 text-center sm:py-32">
                <h2
                  className={`${serif.className} text-3xl tracking-tight sm:text-4xl`}
                >
                  {t("ctaTitle")}
                </h2>
                <p className="mt-3 text-[0.94rem] text-muted-foreground">
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

            {/* Footer */}
            <div className="border-t border-border/40 py-6 dark:border-white/[0.04]">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-foreground text-[10px] font-bold text-background">
                    B
                  </div>
                  <span className="text-xs text-muted-foreground/60">
                    {t("footerCopyright")}
                  </span>
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
