"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type HTMLMotionProps,
} from "motion/react";
import type { ReactNode } from "react";

const easeOut = [0.23, 1, 0.32, 1] as const;

const disclosureTransition = {
  duration: 0.14,
  ease: easeOut,
};

export function AnimatedDisclosure({
  children,
  className,
  open,
}: {
  children: ReactNode;
  className?: string;
  open: boolean;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className={cn("overflow-clip", className)}
          exit={{ height: 0, opacity: reduceMotion ? 1 : 0 }}
          initial={{ height: 0, opacity: reduceMotion ? 1 : 0 }}
          transition={reduceMotion ? { duration: 0 } : disclosureTransition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function AnimatedTreeRows({ children }: { children: ReactNode }) {
  return <AnimatePresence initial={false}>{children}</AnimatePresence>;
}

type AnimatedTreeRowProps = Omit<HTMLMotionProps<"li">, "children"> & {
  children: ReactNode;
  contentClassName?: string;
};

export function AnimatedTreeRow({
  children,
  className,
  contentClassName,
  ...props
}: AnimatedTreeRowProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.li
      animate={{ height: "auto", opacity: 1, transform: "translateY(0px)" }}
      className={cn("relative overflow-visible", className)}
      exit={{
        height: 0,
        opacity: reduceMotion ? 1 : 0,
        overflow: "hidden",
        transform: "translateY(-2px)",
        transition: reduceMotion
          ? { duration: 0 }
          : {
              height: { duration: 0.16, ease: easeOut },
              opacity: { duration: 0.1, ease: easeOut },
              transform: { duration: 0.12, ease: easeOut },
            },
      }}
      initial={{
        height: 0,
        opacity: reduceMotion ? 1 : 0,
        transform: reduceMotion ? "translateY(0px)" : "translateY(-2px)",
      }}
      transition={
        reduceMotion
          ? { duration: 0 }
          : {
              height: { duration: 0.14, ease: easeOut },
              opacity: { duration: 0.1, ease: easeOut },
              transform: { duration: 0.12, ease: easeOut },
            }
      }
      {...props}
    >
      {contentClassName ? (
        <div className={contentClassName}>{children}</div>
      ) : (
        children
      )}
    </motion.li>
  );
}
