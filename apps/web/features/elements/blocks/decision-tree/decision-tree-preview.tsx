import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../registry";

export function DecisionTreePreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-3 flex flex-col gap-1.5 justify-center",
        className,
      )}
    >
      {/* Tree branch visualization */}
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        <div className="h-[1px] w-3 bg-muted-foreground/20" />
        <div className="flex-1 h-2 bg-muted-foreground/15 rounded-sm" />
      </div>
      <div className="flex items-center gap-1.5 pl-4">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/25" />
        <div className="h-[1px] w-2 bg-muted-foreground/15" />
        <div className="flex-1 h-2 bg-muted-foreground/10 rounded-sm" />
      </div>
      <div className="flex items-center gap-1.5 pl-4">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/25" />
        <div className="h-[1px] w-2 bg-muted-foreground/15" />
        <div className="flex-1 h-2 bg-muted-foreground/10 rounded-sm" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        <div className="h-[1px] w-3 bg-muted-foreground/20" />
        <div className="flex-1 h-2 bg-muted-foreground/15 rounded-sm" />
      </div>
    </div>
  );
}
