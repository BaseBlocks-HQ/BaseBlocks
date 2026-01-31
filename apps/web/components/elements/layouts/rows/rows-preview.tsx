import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";

export function RowsPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2 flex flex-col gap-1", className)}>
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}
