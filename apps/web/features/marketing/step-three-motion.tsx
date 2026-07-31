"use client";

import createGlobe, { type Arc, type Marker } from "cobe";
import { ArrowUpRight, Check, Globe2, LockKeyhole, Radio } from "lucide-react";
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

const analyticsChartPoints = [
  { date: "Jul 8", x: 72, y: 70 },
  { date: "Jul 14", x: 144, y: 52 },
  { date: "Jul 20", x: 216, y: 59 },
  { date: "Jul 26", x: 288, y: 34 },
] as const;

const analyticsChartLine = analyticsChartPoints
  .map(({ x, y }) => `${x},${y}`)
  .join(" ");
const analyticsChartArea = `72,100 ${analyticsChartLine} 288,100`;

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
        className="step-publish-panel"
        transition={{ duration: 0.48, ease: EASE }}
      >
        <header>
          <strong>Publish site</strong>
        </header>
        <span className="step-publish-visibility-label">Visibility</span>
        <div className="step-publish-options">
          <VisibilityOption
            active={!publicSelected}
            description="Workspace members"
            icon={<LockKeyhole aria-hidden="true" />}
            label="Team"
          />
          <VisibilityOption
            active={publicSelected}
            description="Anyone with the link"
            icon={<Globe2 aria-hidden="true" />}
            label="Public"
          />
        </div>
        <motion.div
          animate={{ scale: publishing ? 0.96 : 1 }}
          className="step-publish-action"
          transition={{ duration: 0.24, ease: EASE }}
        >
          {publishing ? <i /> : <Globe2 aria-hidden="true" />}
          <span>{publishing ? "Publishing…" : "Publish site"}</span>
        </motion.div>
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
        className={`step-publish-analytics ${chartVisible ? "is-visible" : ""}`}
        transition={{ duration: 0.58, ease: EASE }}
      >
        <header>
          <strong>Analytics</strong>
        </header>
        <div className="step-publish-metrics">
          <AnalyticsMetric label="Visitors" value="1,842" change="12%" />
          <AnalyticsMetric label="Page views" value="4,921" change="18%" />
          <div>
            <span>Online now</span>
            <div>
              <strong>24</strong>
              <Radio aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="step-publish-traffic">
          <div className="step-publish-traffic-header">
            <div>
              <span>Traffic over time</span>
              <small>Page views · Last 7 days</small>
            </div>
          </div>
          <svg aria-hidden="true" viewBox="0 0 360 126">
            <defs>
              <linearGradient
                id="step-publish-traffic-fill"
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {[18, 45, 72, 100].map((y) => (
              <line
                key={y}
                className="step-publish-grid-line"
                x1="72"
                x2="288"
                y1={y}
                y2={y}
              />
            ))}
            <polygon
              className="step-publish-chart-area"
              points={analyticsChartArea}
            />
            <polyline
              className="step-publish-chart-line"
              points={analyticsChartLine}
            />
            {analyticsChartPoints.map(({ date, x, y }) => (
              <circle key={date} cx={x} cy={y} r="2.5" />
            ))}
            {analyticsChartPoints.map(({ date, x }) => (
              <text key={date} x={x} y="121" textAnchor="middle">
                {date}
              </text>
            ))}
          </svg>
        </div>
      </motion.div>
    </motion.div>
  );
}

function AnalyticsMetric({
  change,
  label,
  value,
}: {
  change: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <small>
          <ArrowUpRight aria-hidden="true" />
          {change}
        </small>
      </div>
    </div>
  );
}

function VisibilityOption({
  active,
  description,
  icon,
  label,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <span className={active ? "is-active" : ""}>
      <i>{icon}</i>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
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
