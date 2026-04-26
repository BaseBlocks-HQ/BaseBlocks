import type { ElementType } from "@baseblocks/types";
import { cn } from "@baseblocks/ui/lib/utils";

export function getEditorLayoutSurfaceClassName({
  isHovered,
  isSelected,
  hasSelectedChild,
}: {
  isHovered: boolean;
  isSelected: boolean;
  hasSelectedChild: boolean;
}) {
  return cn(
    "rounded-md border border-transparent transition-[background-color,border-color,box-shadow] duration-150 ease-out",
    isHovered && !isSelected && "bg-muted/20 border-border/50",
    isSelected &&
      !hasSelectedChild &&
      "bg-muted/25 border-ring/30 shadow-[inset_0_0_0_1px_hsl(var(--ring)/0.12)]",
    isSelected &&
      hasSelectedChild &&
      "bg-muted/15 border-ring/20 shadow-[inset_0_0_0_1px_hsl(var(--ring)/0.08)]",
  );
}

export function getEditorBlockSurfaceClassName({
  isSelected,
  type,
}: {
  isSelected: boolean;
  type: ElementType;
}) {
  const usesTransparentSelectionSurface = type === "heading";

  return cn(
    "rounded-md transition-[background-color,box-shadow] duration-150 ease-out",
    isSelected &&
      (usesTransparentSelectionSurface
        ? "shadow-[inset_0_0_0_1px_hsl(var(--ring)/0.18)]"
        : "bg-background/80 shadow-[inset_0_0_0_1px_hsl(var(--ring)/0.22)]"),
  );
}
