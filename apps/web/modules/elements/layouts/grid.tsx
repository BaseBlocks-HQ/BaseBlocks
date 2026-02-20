import { cn } from "@/lib/utils";
import type { ElementPreviewProps } from "../registry";
import { LayoutGrid } from "lucide-react";
import { registerLayout } from "../registry";

function GridPreview({ className }: ElementPreviewProps) {
  return (
    <div
      className={cn(
        "w-full h-full p-2 grid grid-cols-2 grid-rows-2 gap-1",
        className,
      )}
    >
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
      <div className="bg-muted/50 rounded border border-dashed border-muted-foreground/30" />
    </div>
  );
}

registerLayout({
  type: "grid",
  category: "layouts",
  label: "Grid",
  description: "Grid layout",
  icon: LayoutGrid,
  keywords: ["grid", "matrix", "cells"],
  preview: GridPreview,
});
