import { cn } from "@/lib/utils";
import { MoveVertical } from "lucide-react";
import type { ElementPreviewProps } from "../../registry";

export function SpacerLayoutPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-2 flex flex-col items-center justify-center gap-1",
        className,
      )}
    >
      <div className="w-full h-1 bg-muted-foreground/20 rounded" />
      <MoveVertical className="h-4 w-4 text-muted-foreground/40" />
      <div className="w-full h-1 bg-muted-foreground/20 rounded" />
    </div>
  );
}
