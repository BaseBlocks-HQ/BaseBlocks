"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { Sidebar } from "@baseblocks/ui/sidebar";
import type { ComponentProps } from "react";

export const sidebarFloatingInnerClass =
  "[&_[data-slot=sidebar-inner]]:rounded-xl [&_[data-slot=sidebar-inner]]:border [&_[data-slot=sidebar-inner]]:border-sidebar-foreground/[0.06] [&_[data-slot=sidebar-inner]]:!bg-sidebar [&_[data-slot=sidebar-inner]]:text-sidebar-foreground [&_[data-slot=sidebar-inner]]:shadow-sm";

export function AppSidebarFrame({
  className,
  mobileClassName,
  mobileWidthClassName = "!w-[min(13.5rem,calc(100vw-1rem))]",
  style,
  width = "13.5rem",
  ...props
}: ComponentProps<typeof Sidebar> & {
  mobileWidthClassName?: string;
  width?: string;
}) {
  return (
    <Sidebar
      className={cn("min-h-svh", sidebarFloatingInnerClass, className)}
      collapsible="offcanvas"
      mobileClassName={cn(
        "!top-2 !bottom-2 !left-2 !max-h-[calc(100svh-1rem)] rounded-xl !border !border-sidebar-foreground/[0.06] !bg-sidebar shadow-sm",
        mobileWidthClassName,
        mobileClassName,
      )}
      style={{ "--sidebar-width": width, ...style } as React.CSSProperties}
      variant="floating"
      {...props}
    />
  );
}
