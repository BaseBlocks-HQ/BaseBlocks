"use client";

import { Button } from "@baseblocks/ui/button";
import { DialogFooter } from "@baseblocks/ui/dialog";
import type { FormEvent, ReactNode } from "react";

import { DialogShell } from "./dialog-shell";

interface FormDialogProps {
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
}

/**
 * Base form dialog wrapper - eliminates dialog boilerplate duplication
 */
export function FormDialog({
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
}: FormDialogProps) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      trigger={trigger}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </DialogShell>
  );
}
