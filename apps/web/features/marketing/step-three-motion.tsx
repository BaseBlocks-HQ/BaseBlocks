"use client";

import createGlobe, { type Arc, type Marker } from "cobe";
import { BarChart3, Check, Globe2, LockKeyhole } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type TimelineMode =
  | "privacy"
  | "public"
  | "publishing"
  | "deploying"
  | "live"
  | "analytics"
  | "analyticsHold"
  | "fade";

interface TimelineEvent {
  duration: number;
  mode: TimelineMode;
}

const firstEvent: TimelineEvent = { duration: 1400, mode: "privacy" };
const timeline: readonly TimelineEvent[] = [
  firstEvent,
  { duration: 900, mode: "public" },
  { duration: 1000, mode: "publishing" },
  { duration: 2400, mode: "deploying" },
  { duration: 1200, mode: "live" },
  { duration: 1000, mode: "analytics" },
  { duration: 2500, mode: "analyticsHold" },
  { duration: 400, mode: "fade" },
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
  const isInView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    if (!(isInView && !reduceMotion)) {
      return;
    }

    const event = timeline[eventIndex] ?? firstEvent;
    const timer = window.setTimeout(() => {
      setEventIndex((current) => (current + 1) % timeline.length);
    }, event.duration);

    return () => window.clearTimeout(timer);
  }, [eventIndex, isInView, reduceMotion]);

  const mode = reduceMotion
    ? ("analyticsHold" satisfies TimelineMode)
    : (timeline[eventIndex]?.mode ?? firstEvent.mode);
  const publicReady = mode !== "privacy";
  const publishing = mode === "publishing";
  const deploymentReady = [
    "deploying",
    "live",
    "analytics",
    "analyticsHold",
  ].includes(mode);
  const live = ["live", "analytics", "analyticsHold"].includes(mode);
  const analyticsReady = mode === "analytics" || mode === "analyticsHold";
  const fading = mode === "fade";

  return (
    <div
      className={`step-three-scene ${publicReady ? "has-public" : ""} ${
        publishing ? "is-publishing" : ""
      } ${deploymentReady ? "has-deployment" : ""} ${
        live ? "is-live" : ""
      } ${analyticsReady ? "has-analytics" : ""} ${fading ? "is-fading" : ""}`}
      ref={ref}
    >
      <div className="step-three-publish-card">
        <header>
          <span>Publish Atlas Handbook</span>
          <small>Choose who can view this site.</small>
        </header>

        <div className="step-three-privacy-options">
          <PrivacyOption
            active={publicReady}
            description="Anyone can view this site"
            icon={<Globe2 aria-hidden="true" />}
            label="Public"
          />
          <PrivacyOption
            active={!publicReady}
            description="Only team members can view"
            icon={<LockKeyhole aria-hidden="true" />}
            label="Team only"
          />
        </div>

        <div className="step-three-publish-button">
          <span className="step-three-button-spinner" />
          <span>{publishing ? "Publishing…" : "Publish site"}</span>
        </div>
      </div>

      <div className="step-three-deployment">
        <DeploymentGlobe
          active={isInView && deploymentReady && !analyticsReady}
        />
        <div className="step-three-deployment-status">
          <span>
            {live ? <Check aria-hidden="true" /> : <i aria-hidden="true" />}
          </span>
          <div>
            <strong>{live ? "Live worldwide" : "Deploying worldwide"}</strong>
            <small>
              {live ? "4 regions connected" : "Connecting edge regions"}
            </small>
          </div>
        </div>
      </div>

      <AnalyticsPanel />
    </div>
  );
}

function PrivacyOption({
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
    <div className={`step-three-privacy-option ${active ? "is-active" : ""}`}>
      <span className="step-three-privacy-icon">{icon}</span>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <i />
    </div>
  );
}

function DeploymentGlobe({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!(canvas && active)) {
      return;
    }

    const dark = resolvedTheme === "dark";
    let animationFrame = 0;
    let phi = 0.3;
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
      const markerCount = Math.min(
        deploymentMarkers.length,
        Math.max(0, Math.floor(elapsed / 330) + 1),
      );
      const arcCount = Math.min(
        deploymentArcs.length,
        Math.max(0, Math.floor((elapsed - 450) / 440) + 1),
      );

      phi += 0.0022;
      globe.update({
        phi,
        markers: deploymentMarkers.slice(0, markerCount),
        arcs: deploymentArcs.slice(0, arcCount),
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

function AnalyticsPanel() {
  return (
    <div className="step-three-analytics">
      <header>
        <div>
          <span className="step-three-analytics-icon">
            <BarChart3 aria-hidden="true" />
          </span>
          <span>
            <strong>Atlas Handbook</strong>
            <small>Last 30 days</small>
          </span>
        </div>
        <i>Live</i>
      </header>

      <div className="step-three-metrics">
        <Metric delta="+24%" label="Views" value="1,842" />
        <Metric delta="+18%" label="Visitors" value="612" />
        <Metric delta="+36s" label="Avg. read" value="4m 12s" />
      </div>

      <div className="step-three-chart">
        <span>Readers over time</span>
        <svg aria-hidden="true" viewBox="0 0 300 58" preserveAspectRatio="none">
          <path
            className="step-three-chart-area"
            d="M0 55 C32 51 48 45 74 47 S113 34 142 38 S184 24 213 29 S255 9 300 13 L300 58 L0 58 Z"
          />
          <path
            className="step-three-chart-line"
            d="M0 55 C32 51 48 45 74 47 S113 34 142 38 S184 24 213 29 S255 9 300 13"
          />
        </svg>
      </div>

      <div className="step-three-activity">
        <span>Popular pages</span>
        <ActivityRow label="Product handbook" value="486" width="86%" />
        <ActivityRow label="Getting started" value="322" width="64%" />
        <ActivityRow label="API reference" value="271" width="52%" />
      </div>
    </div>
  );
}

function Metric({
  delta,
  label,
  value,
}: {
  delta: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </div>
  );
}

function ActivityRow({
  label,
  value,
  width,
}: {
  label: string;
  value: string;
  width: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <i>
        <b style={{ width }} />
      </i>
      <small>{value}</small>
    </div>
  );
}
