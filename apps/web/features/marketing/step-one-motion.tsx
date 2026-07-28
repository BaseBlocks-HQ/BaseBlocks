"use client";

import { ArrowUp, Check, Search } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

const QUERY = "Product handbook";
const PAGES = [
  { label: "Overview", path: "/" },
  { label: "Product handbook", path: "/handbook" },
  { label: "Resources", path: "/resources" },
  { label: "Launch notes", path: "/launch-notes" },
] as const;
const EASE = [0.23, 1, 0.32, 1] as const;

type Scene = "idle" | "typing" | "building" | "ready" | "fade" | "reset";

const timeline: readonly { count?: number; duration: number; scene: Scene }[] =
  [
    { duration: 700, scene: "idle" },
    ...Array.from(QUERY, (_, index) => ({
      count: index + 1,
      duration: 70,
      scene: "typing" as const,
    })),
    { duration: 700, scene: "building" },
    { duration: 2500, scene: "ready" },
    { duration: 620, scene: "fade" },
    { duration: 650, scene: "reset" },
  ];

export function StepOneMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!(inView && !reduceMotion)) return;

    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % timeline.length);
    }, timeline[step]?.duration ?? 700);

    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, step]);

  const scene = reduceMotion ? "ready" : (timeline[step]?.scene ?? "idle");
  const characters =
    scene === "typing"
      ? (timeline[step]?.count ?? 0)
      : scene === "idle"
        ? 0
        : QUERY.length;
  const showPages =
    scene === "building" || scene === "ready" || scene === "fade";

  return (
    <motion.div
      animate={{ opacity: scene === "fade" || scene === "reset" ? 0 : 1 }}
      className="step-connect-scene"
      ref={ref}
      transition={{ duration: 0.36, ease: EASE }}
    >
      <motion.div
        animate={{
          opacity: showPages ? 0 : 1,
          x: "-50%",
          y: showPages ? "calc(-50% - 6px)" : "-50%",
        }}
        className="step-connect-composer"
        transition={{ duration: 0.7, ease: EASE }}
      >
        <div className="step-connect-input">
          <span>
            {QUERY.slice(0, characters)}
            {scene === "typing" ? <i className="step-motion-caret" /> : null}
            {scene === "idle" ? "Name your first page…" : null}
          </span>
        </div>
        <div className="step-connect-actions">
          <span>
            <Search aria-hidden="true" />
          </span>
          <motion.i
            animate={{ scale: scene === "building" ? 0.88 : 1 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <ArrowUp aria-hidden="true" />
          </motion.i>
        </div>
      </motion.div>

      <AnimatePresence initial={false}>
        {showPages ? (
          <motion.div
            animate={{ opacity: 1, x: "-50%", y: 0 }}
            className="step-connect-results"
            exit={{ opacity: 0, x: "-50%", y: 8 }}
            initial={{ opacity: 0, x: "-50%", y: 14 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {PAGES.map(({ label, path }, index) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                initial={{ opacity: 0, x: -8 }}
                key={path}
                transition={{
                  delay: 0.12 + index * 0.11,
                  duration: 0.38,
                  ease: EASE,
                }}
              >
                <span>{path}</span>
                <small>{label}</small>
                <i>
                  <Check aria-hidden="true" />
                </i>
              </motion.div>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
