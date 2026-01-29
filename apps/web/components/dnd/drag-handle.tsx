"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";
import { type HTMLAttributes, forwardRef } from "react";

interface DragHandleProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Drag handle component - uses div with role="button" to avoid
 * nested button issues when used inside interactive elements
 */
export const DragHandle = forwardRef<HTMLDivElement, DragHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded text-muted-foreground",
          "hover:text-foreground hover:bg-accent",
          "cursor-grab active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors",
          className,
        )}
        {...props}
      >
        <GripVertical className="h-4 w-4" />
      </div>
    );
  },
);

DragHandle.displayName = "DragHandle";
