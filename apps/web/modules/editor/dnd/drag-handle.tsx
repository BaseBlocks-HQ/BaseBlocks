"use client";

import { cn } from "@baseblocks/ui/lib/utils";
import { GripVertical } from "lucide-react";
import type { HTMLAttributes, Ref } from "react";

interface DragHandleProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * Drag handle component for sortable controls.
 */
export function DragHandle({ className, ref, ...props }: DragHandleProps) {
  return (
    <div
      ref={ref}
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
}
