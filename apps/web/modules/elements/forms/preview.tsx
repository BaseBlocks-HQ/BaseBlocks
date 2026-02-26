"use client";

import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "@/modules/elements/framework/registry";

export function FormPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="space-y-1.5">
        <div className="space-y-0.5">
          <div className="h-1.5 w-8 bg-muted-foreground/40 rounded" />
          <div className="h-4 w-full bg-muted rounded border" />
        </div>
        <div className="space-y-0.5">
          <div className="h-1.5 w-6 bg-muted-foreground/40 rounded" />
          <div className="h-4 w-full bg-muted rounded border" />
        </div>
        <div className="space-y-0.5">
          <div className="h-1.5 w-10 bg-muted-foreground/40 rounded" />
          <div className="h-8 w-full bg-muted rounded border" />
        </div>
      </div>
      <div className="h-4 w-14 bg-primary/80 rounded" />
    </div>
  );
}
