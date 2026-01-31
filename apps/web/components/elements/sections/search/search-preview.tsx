import type { ElementPreviewProps } from "../../registry";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

export function SearchPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-3 flex items-center", className)}>
      <div className="w-full h-8 bg-muted rounded-md border flex items-center gap-2 px-2">
        <Search className="h-3 w-3 text-muted-foreground" />
        <div className="h-1.5 w-16 bg-muted-foreground/30 rounded" />
      </div>
    </div>
  );
}
