import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../framework/registry";

export function DirectoryPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col gap-1 justify-center",
        className,
      )}
    >
      {/* Header row */}
      <div className="flex gap-1">
        <div className="h-2 flex-1 bg-muted-foreground/30 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/30 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/30 rounded-sm" />
      </div>
      {/* Data rows */}
      <div className="flex gap-1">
        <div className="h-2 flex-1 bg-muted-foreground/15 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/15 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/15 rounded-sm" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 flex-1 bg-muted-foreground/10 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/10 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/10 rounded-sm" />
      </div>
      <div className="flex gap-1">
        <div className="h-2 flex-1 bg-muted-foreground/15 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/15 rounded-sm" />
        <div className="h-2 flex-1 bg-muted-foreground/15 rounded-sm" />
      </div>
    </div>
  );
}
