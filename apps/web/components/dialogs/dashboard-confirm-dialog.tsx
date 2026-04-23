"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@baseblocks/ui/alert-dialog";
import type { ReactNode } from "react";

interface DashboardConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void;
}

export function DashboardConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  confirmDisabled = false,
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: DashboardConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="overflow-hidden rounded-[1.5rem] border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-2xl sm:max-w-[32rem]">
        <AlertDialogHeader className="px-5 pt-5 pb-0 text-left sm:text-left">
          <AlertDialogTitle className="text-base font-semibold text-balance">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription
            asChild
            className="text-sm text-sidebar-foreground/60"
          >
            <div className="text-pretty">{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="px-5 pt-3 pb-4 sm:justify-end">
          <AlertDialogCancel
            size="sm"
            className="rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            size="sm"
            disabled={confirmDisabled}
            className="rounded-full px-4 text-sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
