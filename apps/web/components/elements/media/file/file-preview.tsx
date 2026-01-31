import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";
import { FileText, Download } from "lucide-react";

export function FilePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-full bg-muted rounded-md border flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <div className="h-1.5 w-14 bg-muted-foreground/30 rounded" />
        </div>
        <Download className="h-3 w-3 text-muted-foreground/50" />
      </div>
    </div>
  );
}
