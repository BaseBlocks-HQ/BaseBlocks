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
import { Button } from "@baseblocks/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import type { FormEvent, ReactNode } from "react";

export const dashboardDialogPrimaryFieldLabelClassName =
  "mb-0.5 block text-xs font-medium tracking-wide text-sidebar-foreground/55";

export const dashboardDialogSecondaryFieldLabelClassName =
  "mb-0.5 block text-[11px] font-medium tracking-wide text-sidebar-foreground/45";

export const dashboardDialogPrimaryInlineInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[1.4rem] font-semibold leading-tight tracking-tight text-sidebar-foreground shadow-none placeholder:text-sidebar-foreground/40 focus-visible:ring-0 md:!text-[1.4rem] dark:bg-transparent";

export const dashboardDialogSecondaryInlineInputClassName =
  "h-auto border-0 bg-transparent px-0 py-0.5 text-[0.95rem] leading-snug text-sidebar-foreground/80 shadow-none placeholder:text-sidebar-foreground/35 focus-visible:ring-0 md:!text-[0.95rem] dark:bg-transparent";

export const dashboardDialogFormErrorClassName =
  "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive";

interface DialogShellProps {
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

export function DialogShell({
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
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={contentClassName}
        showCloseButton={showCloseButton}
      >
        {title || description ? (
          <DialogHeader className={headerClassName}>
            {title ? (
              <DialogTitle className={titleClassName}>{title}</DialogTitle>
            ) : null}
            {description ? (
              <DialogDescription className={descriptionClassName}>
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
        ) : null}
        <div className={cn(bodyClassName)}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function DashboardDialogShell({
  contentClassName,
  headerClassName,
  titleClassName,
  descriptionClassName,
  bodyClassName,
  ...props
}: DialogShellProps) {
  return (
    <DialogShell
      {...props}
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
    />
  );
}

interface FormDialogProps extends DialogShellProps {
  title: string;
  description?: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  isSubmitting: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  submittingLabel?: string;
  cancelLabel?: string;
  formClassName?: string;
  footerClassName?: string;
  cancelButtonClassName?: string;
  submitButtonClassName?: string;
}

export function DashboardFormDialog({
  children,
  onSubmit,
  isSubmitting,
  submitDisabled = false,
  submitLabel = "Save",
  submittingLabel = "Saving...",
  cancelLabel = "Cancel",
  formClassName,
  footerClassName,
  cancelButtonClassName,
  submitButtonClassName,
  ...shellProps
}: FormDialogProps) {
  return (
    <DashboardDialogShell {...shellProps}>
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
            onClick={() => shellProps.onOpenChange(false)}
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
            disabled={isSubmitting || submitDisabled}
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

export function FormDialog({
  children,
  onSubmit,
  isSubmitting,
  submitLabel = "Save",
  submittingLabel = "Saving...",
  cancelLabel = "Cancel",
  ...shellProps
}: FormDialogProps) {
  return (
    <DialogShell {...shellProps}>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => shellProps.onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}

interface ConfirmDialogProps {
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

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
}: ConfirmDialogProps) {
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
