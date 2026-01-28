"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface DragHandleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const DragHandle = forwardRef<HTMLButtonElement, DragHandleProps>(
  ({ className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex items-center justify-center h-6 w-6 rounded text-muted-foreground",
          "hover:text-foreground hover:bg-accent",
          "cursor-grab active:cursor-grabbing",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "transition-colors",
          className
        )}
        {...props}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    );
  }
);

DragHandle.displayName = "DragHandle";
