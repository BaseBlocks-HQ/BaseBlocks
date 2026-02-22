import { cn } from "@/lib/utils";
import { Rows3 } from "lucide-react";
import type { ElementPreviewProps } from "../framework/registry";
import { registerLayout } from "../framework/registry";

function RowsPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2 flex flex-col gap-1", className)}>
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}

registerLayout({
  type: "rows",
  category: "layouts",
  label: "Rows",
  description: "Vertical stack of rows",
  icon: Rows3,
  keywords: ["rows", "vertical", "stack"],
  preview: RowsPreview,
});
