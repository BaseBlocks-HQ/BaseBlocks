import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../../framework/registry";

export function LibraryPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2", className)}>
      <div className="w-full h-full border rounded-lg overflow-hidden flex flex-col">
        <div className="flex-1 flex">
          {/* Sidebar */}
          <div className="w-8 border-r bg-muted/20 p-1 flex flex-col gap-0.5">
            <div className="h-1.5 w-full bg-muted-foreground/20 rounded" />
            <div className="h-1.5 w-3/4 bg-muted-foreground/15 rounded" />
            <div className="h-1.5 w-full bg-muted-foreground/15 rounded" />
          </div>
          {/* Content */}
          <div className="flex-1 p-1 flex flex-col gap-0.5">
            <div className="h-1.5 w-3/4 bg-muted-foreground/20 rounded" />
            <div className="h-1.5 w-1/2 bg-muted-foreground/15 rounded" />
            <div className="h-1.5 w-2/3 bg-muted-foreground/15 rounded" />
          </div>
        </div>
        {/* Footer */}
        <div className="h-3 border-t bg-muted/30 px-1 flex items-center">
          <div className="h-1 w-6 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    </div>
  );
}
