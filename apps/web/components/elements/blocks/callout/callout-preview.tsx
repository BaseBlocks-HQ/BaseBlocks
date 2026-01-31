import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export function CalloutPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-full bg-blue-500/10 rounded border-l-2 border-blue-500 flex items-center gap-2 px-2">
        <AlertTriangle className="h-3 w-3 text-blue-500 shrink-0" />
        <div className="flex-1">
          <div className="h-1.5 w-full bg-muted-foreground/30 rounded" />
        </div>
      </div>
    </div>
  );
}
