import { cn } from "@/lib/utils";
import { ChevronRight, FileText } from "lucide-react";
import type { ElementPreviewProps } from "../../registry";

export function SubpagePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-full bg-card rounded-lg border flex items-center px-3 gap-2">
        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-3 w-3 text-primary" />
        </div>
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="h-1.5 w-3/4 bg-foreground/20 rounded" />
          <div className="h-1 w-1/2 bg-muted-foreground/20 rounded" />
        </div>
        <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
      </div>
    </div>
  );
}
