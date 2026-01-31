import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";
import { FolderOpen } from "lucide-react";

export function LibraryPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex flex-col gap-1", className)}>
      <div className="flex items-center gap-1.5">
        <FolderOpen className="h-3 w-3 text-muted-foreground" />
        <div className="h-1.5 w-16 bg-muted-foreground/30 rounded" />
      </div>
      <div className="ml-4 flex flex-col gap-1">
        <div className="h-1.5 w-12 bg-muted-foreground/20 rounded" />
        <div className="h-1.5 w-14 bg-muted-foreground/20 rounded" />
      </div>
    </div>
  );
}
