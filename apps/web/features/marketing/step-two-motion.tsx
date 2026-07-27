"use client";

import { BookOpen, FileText, Home, Library } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type TimelineMode =
  | "document"
  | "documentExit"
  | "placeEnter"
  | "placeHold"
  | "fade";

interface TimelineEvent {
  duration: number;
  mode: TimelineMode;
}

const firstEvent: TimelineEvent = { duration: 1800, mode: "document" };
const timeline: readonly TimelineEvent[] = [
  firstEvent,
  { duration: 320, mode: "documentExit" },
  { duration: 450, mode: "placeEnter" },
  { duration: 3200, mode: "placeHold" },
  { duration: 400, mode: "fade" },
];

const navigationItems = [
  { icon: Home, label: "Overview" },
  { icon: BookOpen, label: "Product handbook" },
  { icon: Library, label: "Resources" },
] as const;

export function StepTwoMotion() {
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
    ? ("placeHold" satisfies TimelineMode)
    : (timeline[eventIndex]?.mode ?? firstEvent.mode);
  const placeReady = ["placeEnter", "placeHold", "fade"].includes(mode);
  const hidden = mode === "documentExit" || mode === "fade";

  return (
    <div
      className={`step-two-scene ${placeReady ? "is-place" : ""} ${
        hidden ? "is-hidden" : ""
      }`}
      ref={ref}
    >
      <div className="step-two-site-shell">
        <aside className="step-two-published-sidebar">
          <div className="step-two-brand">
            <span className="step-two-brand-mark">A</span>
            <span className="step-two-brand-name">Atlas Handbook</span>
          </div>

          <nav className="step-two-navigation">
            {navigationItems.map(({ icon: Icon, label }, index) => (
              <span
                className={index === 1 ? "is-active" : ""}
                key={label}
                style={{ transitionDelay: `${index * 55}ms` }}
              >
                <Icon aria-hidden="true" />
                <i>{label}</i>
              </span>
            ))}
          </nav>
        </aside>

        <main className="step-two-page-content">
          <div className="step-two-page-heading">
            <span aria-hidden="true">
              <FileText />
            </span>
            <h4>Product handbook</h4>
          </div>

          <p>
            Keep every decision, resource, and update in one clear place so the
            whole team can move with confidence.
          </p>

          <div className="step-two-document-blocks">
            <h5>Working together</h5>
            <p>
              Use this handbook as the shared source for product principles,
              plans, and decisions.
            </p>
            <ul>
              <li>
                <FileText aria-hidden="true" />
                Product principles
              </li>
              <li>
                <FileText aria-hidden="true" />
                Planning and decisions
              </li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
