import { cn } from "@/lib/utils";
import { Square } from "lucide-react";
import type { ElementPreviewProps } from "../framework/registry";
import { registerLayout } from "../framework/registry";

function SinglePreview({ className }: ElementPreviewProps) {
  return (
    <div className={cn("w-full h-full p-2", className)}>
      <div className="w-full h-full bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}

registerLayout({
  type: "single",
  category: "layouts",
  label: "Single",
  description: "Full-width single column",
  icon: Square,
  keywords: ["single", "full", "one", "column"],
  preview: SinglePreview,
});
