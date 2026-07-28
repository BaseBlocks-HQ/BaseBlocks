"use client";

import createGlobe, { type Arc, type Marker } from "cobe";
import { ArrowUp, Check, Globe2, LockKeyhole } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

type Scene =
  | "private"
  | "public"
  | "publishing"
  | "deploying"
  | "live"
  | "chart"
  | "chartHold"
  | "fade"
  | "reset";

const timeline: readonly { duration: number; scene: Scene }[] = [
  { duration: 1100, scene: "private" },
  { duration: 1000, scene: "public" },
  { duration: 650, scene: "publishing" },
  { duration: 2300, scene: "deploying" },
  { duration: 1800, scene: "live" },
  { duration: 900, scene: "chart" },
  { duration: 3000, scene: "chartHold" },
  { duration: 620, scene: "fade" },
  { duration: 650, scene: "reset" },
];

const deploymentMarkers: readonly Marker[] = [
  { location: [48.8566, 2.3522], size: 0.055 },
  { location: [40.7128, -74.006], size: 0.055 },
  { location: [1.3521, 103.8198], size: 0.055 },
  { location: [-33.8688, 151.2093], size: 0.055 },
];

const deploymentArcs: readonly Arc[] = [
  { from: [48.8566, 2.3522], to: [40.7128, -74.006] },
  { from: [48.8566, 2.3522], to: [1.3521, 103.8198] },
  { from: [1.3521, 103.8198], to: [-33.8688, 151.2093] },
];

export function StepThreeMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!(inView && !reduceMotion)) return;

    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % timeline.length);
    }, timeline[step]?.duration ?? 1100);

    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, step]);

  const scene = reduceMotion
    ? "chartHold"
    : (timeline[step]?.scene ?? "private");
  const publishVisible = ["private", "public", "publishing"].includes(scene);
  const globeVisible = ["deploying", "live"].includes(scene);
  const chartVisible = ["chart", "chartHold", "fade"].includes(scene);
  const publicSelected = scene !== "private";
  const publishing = scene === "publishing";
  const live = scene === "live";

  return (
    <motion.div
      animate={{ opacity: scene === "fade" || scene === "reset" ? 0 : 1 }}
      className="step-publish-scene"
      ref={ref}
      transition={{ duration: 0.55, ease: EASE }}
    >
      <motion.div
        animate={{
          opacity: publishVisible ? 1 : 0,
          scale: publishVisible ? 1 : 0.985,
          x: "-50%",
          y: publishVisible ? "-50%" : "calc(-50% - 6px)",
        }}
        className="step-publish-choice"
        transition={{ duration: 0.48, ease: EASE }}
      >
        <span className="step-publish-question">Who can open this site?</span>
        <div className="step-publish-options">
          <VisibilityOption
            active={!publicSelected}
            icon={<LockKeyhole aria-hidden="true" />}
            label="Team"
          />
          <VisibilityOption
            active={publicSelected}
            icon={<Globe2 aria-hidden="true" />}
            label="Public"
          />
        </div>
        <motion.i
          animate={{ scale: publishing ? 0.9 : 1 }}
          className={publishing ? "is-publishing" : ""}
          transition={{ duration: 0.24, ease: EASE }}
        >
          {publishing ? <span /> : <ArrowUp aria-hidden="true" />}
        </motion.i>
      </motion.div>

      <motion.div
        animate={{
          opacity: globeVisible ? 1 : 0,
          scale: globeVisible ? 1 : 0.96,
          y: globeVisible ? 0 : 8,
        }}
        className="step-publish-globe"
        transition={{ duration: 0.62, ease: EASE }}
      >
        <DeploymentGlobe active={inView && globeVisible} />
        <motion.div
          animate={{
            opacity: live ? 1 : 0.62,
            x: "-50%",
            y: live ? 0 : 4,
          }}
          className="step-publish-live"
          transition={{ duration: 0.42, ease: EASE }}
        >
          {live ? <Check aria-hidden="true" /> : <i />}
          <span>{live ? "Live" : "Publish it"}</span>
        </motion.div>
      </motion.div>

      <motion.div
        animate={{
          opacity: chartVisible ? 1 : 0,
          scale: chartVisible ? 1 : 0.985,
          x: chartVisible ? "-50%" : "calc(-50% + 8px)",
          y: "-50%",
        }}
        className={`step-publish-chart ${chartVisible ? "is-visible" : ""}`}
        transition={{ duration: 0.58, ease: EASE }}
      >
        <div>
          <span>Readers</span>
          <small>Last 30 days</small>
        </div>
        <strong>1,842</strong>
        <svg
          aria-hidden="true"
          viewBox="0 0 300 104"
          preserveAspectRatio="none"
        >
          <path
            className="step-publish-chart-area"
            d="M0 97 C27 93 48 82 76 85 S115 63 145 70 S186 45 214 51 S258 20 300 25 L300 104 L0 104 Z"
          />
          <path
            className="step-publish-chart-line"
            d="M0 97 C27 93 48 82 76 85 S115 63 145 70 S186 45 214 51 S258 20 300 25"
          />
        </svg>
      </motion.div>
    </motion.div>
  );
}

function VisibilityOption({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className={active ? "is-active" : ""}>
      {icon}
      {label}
    </span>
  );
}

function DeploymentGlobe({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!(canvas && active)) return;

    const dark = resolvedTheme === "dark";
    let animationFrame = 0;
    let phi = 0.3 + Math.PI;
    const startedAt = window.performance.now();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(canvas.offsetWidth, 1);

    const globe = createGlobe(canvas, {
      width: size * dpr,
      height: size * dpr,
      devicePixelRatio: dpr,
      phi,
      theta: 0.18,
      dark: dark ? 1 : 0,
      diffuse: dark ? 1.35 : 2.6,
      mapSamples: dark ? 12_000 : 20_000,
      mapBrightness: dark ? 4.8 : 1.8,
      baseColor: dark ? [0.18, 0.18, 0.18] : [0.9, 0.9, 0.9],
      markerColor: dark ? [0.82, 0.82, 0.82] : [0.22, 0.22, 0.22],
      glowColor: dark ? [0.07, 0.07, 0.07] : [0.96, 0.96, 0.96],
      arcColor: dark ? [0.72, 0.72, 0.72] : [0.3, 0.3, 0.3],
      arcHeight: 0.14,
      arcWidth: 0.55,
      markerElevation: 0.02,
      markers: [],
      arcs: [],
      opacity: 0.92,
    });

    const render = (now: number) => {
      const elapsed = now - startedAt;
      phi += 0.0022;
      globe.update({
        phi,
        markers: deploymentMarkers.slice(
          0,
          Math.min(
            deploymentMarkers.length,
            Math.max(0, Math.floor(elapsed / 330) + 1),
          ),
        ),
        arcs: deploymentArcs.slice(
          0,
          Math.min(
            deploymentArcs.length,
            Math.max(0, Math.floor((elapsed - 450) / 440) + 1),
          ),
        ),
      });
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      globe.destroy();
    };
  }, [active, resolvedTheme]);

  return <canvas ref={canvasRef} />;
}
