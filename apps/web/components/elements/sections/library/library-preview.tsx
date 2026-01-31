import { cn } from "@/lib/utils";
import { FileText, Folder, Upload } from "lucide-react";
import type { ElementPreviewProps } from "../../registry";

export function LibraryPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2", className)}>
      <div className="w-full h-full border rounded-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b">
          <div className="h-1.5 w-12 bg-muted-foreground/30 rounded" />
          <Upload className="h-2.5 w-2.5 text-muted-foreground/50" />
        </div>
        {/* Content */}
        <div className="flex flex-1 min-h-0">
          {/* Folder sidebar */}
          <div className="w-8 border-r bg-muted/30 p-1 flex flex-col gap-1">
            <div className="flex items-center gap-0.5">
              <Folder className="h-2 w-2 text-muted-foreground/50" />
              <div className="h-1 w-4 bg-muted-foreground/20 rounded" />
            </div>
            <div className="flex items-center gap-0.5 ml-1">
              <Folder className="h-2 w-2 text-muted-foreground/40" />
              <div className="h-1 w-3 bg-muted-foreground/15 rounded" />
            </div>
          </div>
          {/* File list */}
          <div className="flex-1 p-1 flex flex-col gap-1">
            <div className="flex items-center gap-1">
              <FileText className="h-2 w-2 text-muted-foreground/50" />
              <div className="h-1 w-8 bg-muted-foreground/20 rounded" />
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-2 w-2 text-muted-foreground/50" />
              <div className="h-1 w-6 bg-muted-foreground/20 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
