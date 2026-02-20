import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function CalloutPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-full bg-muted rounded-lg border flex items-center px-3">
        <div className="flex flex-col gap-1 flex-1">
          <div className="h-1.5 w-3/4 bg-muted-foreground/30 rounded" />
          <div className="h-1.5 w-1/2 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    </div>
  );
}
