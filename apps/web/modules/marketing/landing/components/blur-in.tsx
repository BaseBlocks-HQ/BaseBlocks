import { m } from "motion/react";
import type { ReactNode } from "react";

interface BlurInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

export function BlurIn({ children, delay = 0, className = "" }: BlurInProps) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: [0.2, 0.65, 0.3, 0.9], delay }}
    >
      {children}
    </m.div>
  );
}
