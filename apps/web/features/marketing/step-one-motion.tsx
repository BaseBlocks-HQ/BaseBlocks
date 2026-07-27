"use client";

import { FileText, Heading1, Pilcrow } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

const TITLE = "Product handbook";
const PARAGRAPH =
  "Keep every decision, resource, and update in one clear place so the whole team can move with confidence.";
const SLASH_QUERY = "/page";
const EASE = [0.16, 1, 0.3, 1] as const;

type TimelineMode =
  | "overview"
  | "zoom"
  | "title"
  | "titlePause"
  | "paragraph"
  | "copyPause"
  | "pan"
  | "slash"
  | "select"
  | "insert"
  | "fade";

interface TimelineEvent {
  count?: number;
  duration: number;
  mode: TimelineMode;
}

const firstEvent: TimelineEvent = { duration: 1400, mode: "overview" };

const timeline: readonly TimelineEvent[] = [
  firstEvent,
  { duration: 700, mode: "zoom" },
  ...Array.from(TITLE, (_, index) => ({
    count: index + 1,
    duration: 72,
    mode: "title" as const,
  })),
  { duration: 500, mode: "titlePause" },
  ...Array.from(PARAGRAPH, (_, index) => ({
    count: index + 1,
    duration: 24,
    mode: "paragraph" as const,
  })),
  { duration: 550, mode: "copyPause" },
  { duration: 700, mode: "pan" },
  ...Array.from(SLASH_QUERY, (_, index) => ({
    count: index + 1,
    duration: 210,
    mode: "slash" as const,
  })),
  { duration: 650, mode: "select" },
  { duration: 1800, mode: "insert" },
  { duration: 450, mode: "fade" },
];

const menuItems = [
  { icon: Pilcrow, label: "Text" },
  { icon: Heading1, label: "Heading 1" },
  { icon: FileText, label: "Page" },
] as const;

export function StepOneMotion() {
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

  const event = reduceMotion
    ? ({ duration: 0, mode: "insert" } satisfies TimelineEvent)
    : (timeline[eventIndex] ?? firstEvent);
  const mode = event.mode;
  const zoomedIn = mode !== "overview";
  const title =
    mode === "overview" || mode === "zoom"
      ? ""
      : TITLE.slice(0, mode === "title" ? event.count : TITLE.length);
  const paragraph =
    mode === "paragraph"
      ? PARAGRAPH.slice(0, event.count)
      : ["copyPause", "pan", "slash", "select", "insert", "fade"].includes(mode)
        ? PARAGRAPH
        : "";
  const slashQuery =
    mode === "slash"
      ? SLASH_QUERY.slice(0, event.count)
      : ["select", "insert", "fade"].includes(mode)
        ? SLASH_QUERY
        : "";
  const panned = ["pan", "slash", "select", "insert", "fade"].includes(mode);
  const menuOpen = mode === "slash" || mode === "select";
  const pageSelected = mode === "select";
  const pageInserted = mode === "insert" || mode === "fade";
  const fadingOut = mode === "fade";

  return (
    <motion.div
      animate={{ opacity: fadingOut ? 0 : 1 }}
      className="step-one-scene step-one-editor-scene"
      ref={ref}
      transition={{ duration: 0.42, ease: EASE }}
    >
      <div className="step-editor-viewport">
        <div className="step-editor-document-wrap">
          <motion.div
            animate={{
              scale: zoomedIn ? 1 : 0.72,
              y: panned ? -78 : 0,
            }}
            className={`step-editor-document ${panned ? "is-panned" : ""}`}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <div className="step-editor-document-title">
              {mode === "overview" || mode === "zoom" ? (
                <span className="is-placeholder">Untitled</span>
              ) : (
                <span>
                  {title}
                  {mode === "title" && title.length < TITLE.length ? (
                    <i className="step-editor-caret" />
                  ) : null}
                </span>
              )}
            </div>

            <div className="step-editor-written-copy">
              <span>
                {paragraph}
                {mode === "paragraph" && paragraph.length < PARAGRAPH.length ? (
                  <i className="step-editor-caret" />
                ) : null}
              </span>
            </div>

            <div className="step-editor-insert-line">
              <AnimatePresence mode="wait">
                {pageInserted ? (
                  <motion.div
                    animate={{ opacity: 1, y: 0 }}
                    className="step-editor-page-block"
                    initial={{ opacity: 0, y: 8 }}
                    key="inserted-page"
                    transition={{ duration: 0.44, ease: EASE }}
                  >
                    <span className="step-editor-page-icon">📄</span>
                    <span className="step-editor-page-title">Untitled</span>
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{ opacity: 1 }}
                    className="step-editor-query"
                    exit={{ opacity: 0 }}
                    key="slash-query"
                  >
                    <span>{slashQuery}</span>
                    {mode === "slash" ? (
                      <i className="step-editor-caret" />
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {menuOpen ? (
                  <motion.div
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="step-editor-slash-menu"
                    exit={{ opacity: 0, scale: 0.97, y: -4 }}
                    initial={{ opacity: 0, scale: 0.97, y: 5 }}
                    transition={{ duration: 0.32, ease: EASE }}
                  >
                    {slashQuery.length <= 1 ? (
                      <div className="step-editor-menu-label">Basic blocks</div>
                    ) : null}
                    {(slashQuery.length > 1
                      ? menuItems.slice(2)
                      : menuItems
                    ).map(({ icon: Icon, label }) => (
                      <div
                        className={
                          label === "Page" && pageSelected
                            ? "is-highlighted"
                            : ""
                        }
                        key={label}
                      >
                        <Icon aria-hidden="true" />
                        <span>{label}</span>
                        {label === "Page" && pageSelected ? (
                          <small>↵</small>
                        ) : null}
                      </div>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
