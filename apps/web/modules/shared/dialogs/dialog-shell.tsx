"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@baseblocks/ui/dialog";
import { cn } from "@baseblocks/ui/lib/utils";
import type { ReactNode } from "react";

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
