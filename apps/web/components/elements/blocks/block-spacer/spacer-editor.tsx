"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BlockSpacerContent } from "@/types/elements";
import type { ElementEditorProps } from "@/components/elements/registry";
import { MoveVertical } from "lucide-react";

// Use inline styles for proper responsiveness
const SPACER_HEIGHTS: Record<BlockSpacerContent["height"], number> = {
  small: 32,
  medium: 64,
  large: 96,
  xlarge: 128,
};

const SIZE_LABELS: Record<BlockSpacerContent["height"], string> = {
  small: "S",
  medium: "M",
  large: "L",
  xlarge: "XL",
};

export function SpacerEditor({
  content,
  onUpdate,
}: ElementEditorProps<"block-spacer">) {
  const height = content.height || "medium";

  const handleHeightChange = (newHeight: BlockSpacerContent["height"]) => {
    onUpdate({ height: newHeight });
  };

  return (
    <div
      className={cn(
        "w-full max-w-full box-border",
        "border border-dashed border-muted-foreground/30 rounded-md",
        "flex items-center justify-center gap-2 sm:gap-3",
        "transition-colors",
        "hover:border-muted-foreground/50 hover:bg-muted/30",
      )}
      style={{ height: `${SPACER_HEIGHTS[height]}px` }}
    >
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MoveVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        <span className="text-xs hidden sm:inline">Spacer</span>
      </div>

      {/* Height controls - responsive sizing */}
      <div className="flex gap-0.5 sm:gap-1">
        {(Object.keys(SPACER_HEIGHTS) as Array<BlockSpacerContent["height"]>).map(
          (size) => (
            <Button
              key={size}
              variant={height === size ? "default" : "outline"}
              size="sm"
              className="h-5 w-5 sm:h-6 sm:w-6 p-0 text-[10px] sm:text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleHeightChange(size);
              }}
            >
              {SIZE_LABELS[size]}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
