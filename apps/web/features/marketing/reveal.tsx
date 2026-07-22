import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Reveal({ children, className = "" }: RevealProps) {
  // Keep content in the first paint. CSS entrance animations can update the
  // LCP timestamp even when they begin partially visible.
  return <div className={className}>{children}</div>;
}
