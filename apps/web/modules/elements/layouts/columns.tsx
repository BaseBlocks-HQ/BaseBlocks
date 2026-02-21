import { cn } from "@/lib/utils";
import { Columns3 } from "lucide-react";
import type { ElementPreviewProps } from "../framework/registry";
import { registerLayout } from "../framework/registry";

function ColumnsPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2 flex gap-1", className)}>
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}

registerLayout({
  type: "columns",
  category: "layouts",
  label: "Columns",
  description: "Horizontal columns",
  icon: Columns3,
  keywords: ["columns", "horizontal", "side"],
  preview: ColumnsPreview,
});
