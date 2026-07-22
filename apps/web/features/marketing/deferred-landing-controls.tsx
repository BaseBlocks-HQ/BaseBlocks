"use client";

import { useEffect, useRef, useState } from "react";
import type { LandingControlsProps } from "./landing-controls";

type LandingControlsComponent =
  typeof import("./landing-controls")["LandingControls"];

export function DeferredLandingControls(props: LandingControlsProps) {
  const boundaryRef = useRef<HTMLDivElement>(null);
  const [Controls, setControls] = useState<LandingControlsComponent | null>(
    null,
  );

  useEffect(() => {
    const boundary = boundaryRef.current;
    if (!boundary) return;

    let active = true;
    const loadControls = () => {
      void import("./landing-controls").then(({ LandingControls }) => {
        if (active) setControls(() => LandingControls);
      });
    };

    if (!("IntersectionObserver" in window)) {
      loadControls();
      return () => {
        active = false;
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        loadControls();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(boundary);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex items-center gap-1" ref={boundaryRef}>
      {Controls ? <Controls {...props} /> : <LandingControlsPlaceholder />}
    </div>
  );
}

function LandingControlsPlaceholder() {
  return (
    <>
      <span
        aria-hidden="true"
        className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground"
      >
        <EarthIcon />
      </span>
      <span
        aria-hidden="true"
        className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground"
      >
        <SunIcon className="size-4 rotate-0 scale-100 dark:-rotate-90 dark:scale-0" />
        <MoonIcon className="absolute size-4 rotate-90 scale-0 dark:rotate-0 dark:scale-100" />
      </span>
    </>
  );
}

function EarthIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
    >
      <path d="M21.54 15H17a2 2 0 0 0-2 2v4.54" />
      <path d="M7 3.34V5a3 3 0 0 0 3 3" />
      <path d="M11 21.95V18a2 2 0 0 0-2-2H3.46" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function SunIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
    >
      <path d="M20.985 12.486A9 9 0 1 1 11.514 3.015 7 7 0 0 0 20.985 12.486Z" />
    </svg>
  );
}
