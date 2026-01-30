"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpacerContent } from "@/types/blocks";
import { MoveVertical } from "lucide-react";
import { useState } from "react";
import type { BlockEditorBaseProps } from "../types";

const SPACER_HEIGHTS = {
  small: "h-8",
  medium: "h-16",
  large: "h-24",
  xlarge: "h-32",
} as const;

const SIZE_LABELS: Record<SpacerContent["height"], string> = {
  small: "S",
  medium: "M",
  large: "L",
  xlarge: "XL",
};

export function SpacerEditor({
  block,
  isSelected,
  onUpdate,
}: BlockEditorBaseProps) {
  const content = block.content as SpacerContent;
  const [height, setHeight] = useState<SpacerContent["height"]>(
    content.height || "medium",
  );

  const handleHeightChange = (newHeight: SpacerContent["height"]) => {
    setHeight(newHeight);
    onUpdate({ height: newHeight });
  };

  return (
    <div
      className={cn(
        "w-full border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center gap-3 transition-colors",
        "hover:border-muted-foreground/50 hover:bg-muted/30",
        SPACER_HEIGHTS[height],
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <MoveVertical className="h-4 w-4" />
        <span className="text-xs">Spacer</span>
      </div>

      {/* Height controls - always visible */}
      <div className="flex gap-1">
        {(Object.keys(SPACER_HEIGHTS) as Array<SpacerContent["height"]>).map(
          (size) => (
            <Button
              key={size}
              variant={height === size ? "default" : "outline"}
              size="sm"
              className="h-6 w-6 p-0 text-xs"
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
