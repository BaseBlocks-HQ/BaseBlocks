"use client";

import { cn } from "@baseblocks/ui/lib/utils";

export const editorFlyoutSurfaceClassName =
  "w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[2rem] border bg-background/96 shadow-2xl backdrop-blur-sm sm:w-[min(22rem,calc(100vw-6rem))]";

export function EditorFlyoutSurface({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn(editorFlyoutSurfaceClassName, className)} {...props} />
  );
}
