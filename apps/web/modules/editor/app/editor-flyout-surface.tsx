"use client";

import { cn } from "@baseblocks/ui/lib/utils";

export const editorFlyoutSurfaceClassName =
  "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-2xl backdrop-blur-md sm:w-[min(22rem,calc(100vw-6rem))]";

export function EditorFlyoutSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(editorFlyoutSurfaceClassName, className)} {...props} />
  );
}
