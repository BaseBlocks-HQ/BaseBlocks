import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";
import { MoveVertical } from "lucide-react";

export function BlockSpacerPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex flex-col items-center justify-center gap-2", className)}>
      <div className="w-full h-px bg-muted-foreground/20" />
      <MoveVertical className="h-3 w-3 text-muted-foreground/40" />
      <div className="w-full h-px bg-muted-foreground/20" />
    </div>
  );
}
