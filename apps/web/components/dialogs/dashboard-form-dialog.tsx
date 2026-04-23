"use client";

import { Button } from "@baseblocks/ui/button";
import { DialogFooter } from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import type { FormEvent, ReactNode } from "react";

import { DashboardDialogShell } from "./dashboard-dialog-shell";

interface DashboardFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: ReactNode;
  children: ReactNode;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  formClassName?: string;
  footerClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  bodyClassName?: string;
  cancelButtonClassName?: string;
  submitButtonClassName?: string;
}

export function DashboardFormDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  submittingLabel = "Saving...",
  cancelLabel = "Cancel",
  formClassName,
  footerClassName,
  contentClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
  cancelButtonClassName,
  submitButtonClassName,
}: DashboardFormDialogProps) {
  return (
    <DashboardDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      trigger={trigger}
      contentClassName={contentClassName}
      headerClassName={headerClassName}
      titleClassName={titleClassName}
      descriptionClassName={descriptionClassName}
      bodyClassName={bodyClassName}
    >
      <form
        noValidate
        onSubmit={onSubmit}
        className={cn("space-y-2", formClassName)}
      >
        {children}
        <DialogFooter className={cn("pt-0.5", footerClassName)}>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className={cn(
              "h-8 rounded-full border-sidebar-border/70 bg-transparent px-3.5 text-sm",
              cancelButtonClassName,
            )}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "h-8 rounded-full px-4 text-sm",
              submitButtonClassName,
            )}
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DashboardDialogShell>
  );
}
