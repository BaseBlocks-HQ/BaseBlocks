"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@baseblocks/ui/scroll-area";

interface DetailPanelFrameProps {
  header: React.ReactNode;
  children: React.ReactNode;
  bodyClassName?: string;
  className?: string;
  headerClassName?: string;
  headerOverlay?: boolean;
  scrollAreaClassName?: string;
}

export function DetailPanelFrame({
  header,
  children,
  bodyClassName,
  className,
  headerClassName,
  headerOverlay = false,
  scrollAreaClassName,
}: DetailPanelFrameProps) {
  return (
    <div
      className={cn("relative flex h-full min-h-0 min-w-0 flex-col", className)}
    >
      <div
        className={cn(
          headerOverlay
            ? "pointer-events-none absolute inset-x-0 top-0 z-10"
            : "px-3 py-3 md:px-4",
          headerClassName,
        )}
      >
        <div className={cn(headerOverlay && "pointer-events-auto")}>
          {header}
        </div>
      </div>
      <ScrollArea className={cn("min-h-0 flex-1", scrollAreaClassName)}>
        <div className={cn("min-h-full", bodyClassName)}>{children}</div>
      </ScrollArea>
    </div>
  );
}
