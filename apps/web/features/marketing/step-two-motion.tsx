"use client";

import { Menu } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

type TimelineMode =
  | "draft"
  | "expand"
  | "identity"
  | "navigation"
  | "desktopHold"
  | "mobile"
  | "mobileHold"
  | "return"
  | "settle"
  | "fade";

interface TimelineEvent {
  duration: number;
  mode: TimelineMode;
}

const firstEvent: TimelineEvent = { duration: 1300, mode: "draft" };
const timeline: readonly TimelineEvent[] = [
  firstEvent,
  { duration: 900, mode: "expand" },
  { duration: 850, mode: "identity" },
  { duration: 1000, mode: "navigation" },
  { duration: 1050, mode: "desktopHold" },
  { duration: 950, mode: "mobile" },
  { duration: 1250, mode: "mobileHold" },
  { duration: 900, mode: "return" },
  { duration: 1800, mode: "settle" },
  { duration: 400, mode: "fade" },
];

const navigationItems = [
  "Overview",
  "Getting started",
  "Product",
  "Resources",
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
    ? ("settle" satisfies TimelineMode)
    : (timeline[eventIndex]?.mode ?? firstEvent.mode);
  const siteReady = mode !== "draft";
  const identityReady = !["draft", "expand"].includes(mode);
  const navigationReady = !["draft", "expand", "identity"].includes(mode);
  const mobile = mode === "mobile" || mode === "mobileHold";
  const fading = mode === "fade";

  return (
    <div
      className={`step-two-scene ${siteReady ? "is-site" : "is-draft"} ${
        identityReady ? "has-identity" : ""
      } ${navigationReady ? "has-navigation" : ""} ${
        mobile ? "is-mobile" : ""
      } ${fading ? "is-fading" : ""}`}
      ref={ref}
    >
      <div className="step-two-device-outline" />

      <div className="step-two-site-shell">
        <div className="step-two-draft-page">
          <PublishedPageContent />
        </div>

        <div className="step-two-desktop-site">
          <aside className="step-two-published-sidebar">
            <div className="step-two-brand">
              <span className="step-two-brand-mark">A</span>
              <span>Atlas Handbook</span>
            </div>

            <nav className="step-two-navigation">
              {navigationItems.map((item, index) => (
                <span
                  className={index === 2 ? "is-active" : ""}
                  key={item}
                  style={{ transitionDelay: `${index * 65}ms` }}
                >
                  {item}
                </span>
              ))}
            </nav>

            <span className="step-two-sidebar-note">Updated moments ago</span>
          </aside>

          <div className="step-two-desktop-main">
            <header className="step-two-site-header">
              <span className="step-two-header-path">
                Handbook <i>/</i> Product
              </span>
            </header>

            <PublishedPageContent />
          </div>
        </div>

        <div className="step-two-mobile-site">
          <header className="step-two-mobile-header">
            <span className="step-two-brand-mark">A</span>
            <span>Atlas</span>
            <Menu aria-hidden="true" />
          </header>
          <PublishedPageContent mobile />
        </div>
      </div>
    </div>
  );
}

function PublishedPageContent({ mobile = false }: { mobile?: boolean }) {
  return (
    <main
      className={`step-two-page-content ${mobile ? "is-mobile-content" : ""}`}
    >
      <span className="step-two-page-kicker">Product</span>
      <h4>Product handbook</h4>
      <p>
        Everything your team needs to build, launch, and support the product.
      </p>

      <div className="step-two-page-divider" />

      <span className="step-two-section-label">Start here</span>
      <div className="step-two-resource-card">
        <span>Getting started</span>
        <small>Set up the essentials in a few minutes.</small>
        <i>→</i>
      </div>
    </main>
  );
}
