import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../registry";
import { PanelRight } from "lucide-react";
import { registerLayout } from "../registry";

function VerticalPreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2 flex gap-1", className)}>
      <div className="flex-[2] bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="flex-1 bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}

registerLayout({
  type: "vertical",
  category: "layouts",
  label: "Sidebar",
  description: "Sidebar beside main content",
  icon: PanelRight,
  keywords: ["sidebar", "vertical", "panel", "aside"],
  preview: VerticalPreview,
});
