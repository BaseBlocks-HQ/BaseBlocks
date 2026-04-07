import type * as React from "react";

import { cn } from "./lib/utils";

/**
 * Inner corner radius (matches dashboard sidebar nav pills).
 * Shell inset is `p-1` (0.25rem) — outer radius = inner + gap (concentric).
 */
export const nestedCardRadiusClass = "rounded-[1.15rem] sm:rounded-[1.25rem]";

/** Outer shell: inner radius + `p-1` gap (0.25rem). */
export const nestedCardShellOuterRadiusClass =
  "rounded-[calc(1.15rem+0.25rem)] sm:rounded-[calc(1.25rem+0.25rem)]";

/**
 * Peek row actions: `px-0` so label inset follows `NestedCardPeek` horizontal padding only.
 * Radius matches `nestedCardRadiusClass`. `!` beats `Button` base `rounded-md` and `px-4`.
 */
export const nestedCardPeekActionClass = cn(
  "h-9 min-h-9 min-w-0 flex-1 shrink-0 justify-center text-sm font-normal !px-0 !py-0",
  "!rounded-[1.15rem] sm:!rounded-[1.25rem]",
);

function NestedCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="nested-card"
      className={cn(
        "bg-muted/65 text-card-foreground flex flex-col gap-1 border border-border/70 p-1 shadow-sm dark:bg-muted/40",
        nestedCardShellOuterRadiusClass,
        className,
      )}
      {...props}
    />
  );
}

function NestedCardSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="nested-card-surface"
      className={cn(
        "bg-card flex flex-col border border-border/60 px-2 pb-2 pt-3 shadow-sm dark:bg-background/80",
        nestedCardRadiusClass,
        className,
      )}
      {...props}
    />
  );
}

function NestedCardPeek({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="nested-card-peek"
      className={cn(
        "text-muted-foreground flex min-h-0 w-full min-w-0 flex-nowrap items-stretch gap-1 px-0.5 py-0 text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { NestedCard, NestedCardPeek, NestedCardSurface };
