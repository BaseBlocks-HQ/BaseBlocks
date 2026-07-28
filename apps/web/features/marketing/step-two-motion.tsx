"use client";

import { Check, FileText } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;
const options = ["Every page", "Selected pages", "Team only"] as const;

type Scene =
  | "request"
  | "question"
  | "options"
  | "optionsClose"
  | "answer"
  | "complete"
  | "fade"
  | "reset";

const timeline: readonly { duration: number; scene: Scene }[] = [
  { duration: 1050, scene: "request" },
  { duration: 900, scene: "question" },
  { duration: 1200, scene: "options" },
  { duration: 420, scene: "optionsClose" },
  { duration: 850, scene: "answer" },
  { duration: 2800, scene: "complete" },
  { duration: 620, scene: "fade" },
  { duration: 650, scene: "reset" },
];

export function StepTwoMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!(inView && !reduceMotion)) return;

    const timer = window.setTimeout(() => {
      setStep((current) => (current + 1) % timeline.length);
    }, timeline[step]?.duration ?? 1050);

    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, step]);

  const scene = reduceMotion
    ? "complete"
    : (timeline[step]?.scene ?? "request");
  const rank = timeline.findIndex((item) => item.scene === scene);
  const resetting = scene === "reset";
  const visibleThrough = (target: Scene) =>
    !resetting && rank >= timeline.findIndex((item) => item.scene === target);

  return (
    <motion.div
      animate={{ opacity: scene === "fade" || resetting ? 0 : 1 }}
      className="step-audit-scene"
      ref={ref}
      transition={{ duration: 0.36, ease: EASE }}
    >
      <div className="step-audit-thread">
        <Message align="right" visible={scene === "request" || !resetting}>
          <span>Turn handbook into a site</span>
          <small>
            <FileText aria-hidden="true" /> /handbook
          </small>
        </Message>

        <Message visible={visibleThrough("question")}>
          Which pages should be visible?
        </Message>

        <AnimatePresence initial={false}>
          {scene === "options" ? (
            <motion.div
              animate={{ height: "6.85rem", opacity: 1 }}
              className="step-audit-options"
              exit={{ height: 0, opacity: 0, y: -4 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {options.map((option, index) => (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className={index === 0 ? "is-selected" : ""}
                  initial={{ opacity: 0, y: 5 }}
                  key={option}
                  transition={{
                    delay: index * 0.08,
                    duration: 0.3,
                    ease: EASE,
                  }}
                >
                  <i>{String.fromCharCode(65 + index)}</i>
                  <span>{option}</span>
                </motion.div>
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Message align="right" visible={visibleThrough("answer")}>
          Every page
        </Message>

        <Message visible={visibleThrough("complete")}>
          <strong>
            <Check aria-hidden="true" /> Done.
          </strong>{" "}
          Added navigation, responsive spacing, and reading styles across every
          page.
        </Message>
      </div>
    </motion.div>
  );
}

function Message({
  align = "left",
  children,
  visible,
}: {
  align?: "left" | "right";
  children: ReactNode;
  visible: boolean;
}) {
  return (
    <AnimatePresence initial={false}>
      {visible ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={`step-audit-message is-${align}`}
          initial={{ opacity: 0, y: 7 }}
          transition={{ duration: 0.38, ease: EASE }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
