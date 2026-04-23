"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import type { ReactNode } from "react";

import { DialogShell } from "./dialog-shell";

interface DashboardDialogShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  description?: ReactNode;
  trigger?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bodyClassName?: string;
  showCloseButton?: boolean;
}

export function DashboardDialogShell({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  contentClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
  showCloseButton = true,
}: DashboardDialogShellProps) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      trigger={trigger}
      showCloseButton={showCloseButton}
      contentClassName={cn(
        "overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[46rem] [&_[data-slot='dialog-close']]:top-4 [&_[data-slot='dialog-close']]:right-4",
        contentClassName,
      )}
      headerClassName={cn("px-5 pt-4 pb-0", headerClassName)}
      titleClassName={cn("text-base font-semibold", titleClassName)}
      descriptionClassName={cn(
        "text-sm text-sidebar-foreground/60",
        descriptionClassName,
      )}
      bodyClassName={cn("px-5 pb-3", bodyClassName)}
    >
      {children}
    </DialogShell>
  );
}
