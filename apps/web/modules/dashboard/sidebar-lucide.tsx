import { cn } from "@baseblocks/ui/lib/utils";
import type { SVGProps } from "react";

/** Matches Lucide icons tuned for the dashboard sidebar (e.g. Earth). */
export const SIDEBAR_ICON_STROKE = 1.75;

/**
 * Lucide `House` without the door cutout — only the roof + body outline.
 */
export function HouseNoDoorIcon({
  className,
  strokeWidth = SIDEBAR_ICON_STROKE,
  ...props
}: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
      strokeWidth={strokeWidth}
      {...props}
    >
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}
