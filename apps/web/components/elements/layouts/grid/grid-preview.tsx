import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";

export function GridPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2 grid grid-cols-2 grid-rows-2 gap-1", className)}>
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}
