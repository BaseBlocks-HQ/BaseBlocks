import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function FlowchartPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3", className)}>
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
        {/* Top node */}
        <div className="h-2 w-8 rounded-sm bg-muted-foreground/30" />
        {/* Connector */}
        <div className="h-1.5 w-px bg-muted-foreground/25" />
        {/* Diamond */}
        <div className="h-3 w-3 rotate-45 rounded-[1px] bg-muted-foreground/25" />
        {/* Branches */}
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <div className="h-1.5 w-px bg-muted-foreground/20" />
            <div className="h-2 w-6 rounded-sm bg-muted-foreground/20" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <div className="h-1.5 w-px bg-muted-foreground/20" />
            <div className="h-2 w-6 rounded-sm bg-muted-foreground/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
