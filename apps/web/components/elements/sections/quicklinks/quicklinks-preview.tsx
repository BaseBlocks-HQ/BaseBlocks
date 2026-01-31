import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function QuicklinksPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex gap-2", className)}>
      <div className="flex-1 h-full bg-muted rounded border flex flex-col items-center justify-center p-1">
        <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
        <div className="h-1 w-8 bg-muted-foreground/30 rounded mt-1" />
      </div>
      <div className="flex-1 h-full bg-muted rounded border flex flex-col items-center justify-center p-1">
        <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
        <div className="h-1 w-8 bg-muted-foreground/30 rounded mt-1" />
      </div>
    </div>
  );
}
