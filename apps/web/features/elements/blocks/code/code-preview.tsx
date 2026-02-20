import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function CodePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3", className)}>
      <div className="w-full h-full bg-muted rounded-lg p-2 flex flex-col gap-1 font-mono">
        <div className="h-1 w-1/2 bg-muted-foreground/30 rounded" />
        <div className="h-1 w-3/4 bg-muted-foreground/25 rounded" />
        <div className="h-1 w-1/3 bg-muted-foreground/20 rounded" />
      </div>
    </div>
  );
}
