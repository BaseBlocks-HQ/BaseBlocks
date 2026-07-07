"use client";

import { cn } from "@/lib/utils";

export const splitViewPanelClassName =
  "flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/70 shadow-[0_1px_2px_hsl(var(--foreground)/0.04),0_18px_40px_hsl(var(--foreground)/0.08)] backdrop-blur-xl";

export function SplitViewPanel({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn(splitViewPanelClassName, className)} {...props} />
  );
}
