import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function SinglePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2", className)}>
      <div className="w-full h-full bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}
