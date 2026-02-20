"use client";

/**
 * Form Preview
 * Preview thumbnail for the element picker
 */

import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "@/modules/elements/registry";

export function FormPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Mini form preview */}
      <div className="space-y-1.5">
        {/* Field 1 */}
        <div className="space-y-0.5">
          <div className="h-1.5 w-8 bg-muted-foreground/40 rounded" />
          <div className="h-4 w-full bg-muted rounded border" />
        </div>
        {/* Field 2 */}
        <div className="space-y-0.5">
          <div className="h-1.5 w-6 bg-muted-foreground/40 rounded" />
          <div className="h-4 w-full bg-muted rounded border" />
        </div>
        {/* Field 3 - textarea */}
        <div className="space-y-0.5">
          <div className="h-1.5 w-10 bg-muted-foreground/40 rounded" />
          <div className="h-8 w-full bg-muted rounded border" />
        </div>
      </div>
      {/* Submit button */}
      <div className="h-4 w-14 bg-primary/80 rounded" />
    </div>
  );
}
