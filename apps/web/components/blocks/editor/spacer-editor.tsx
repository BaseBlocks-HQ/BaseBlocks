"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SpacerContent } from "@/types/blocks";
import { MoveVertical } from "lucide-react";
import { useState } from "react";
import type { BlockEditorBaseProps } from "../types";

const SPACER_HEIGHTS = {
  small: { value: "h-8", label: "S", pixels: "32px" },
  medium: { value: "h-16", label: "M", pixels: "64px" },
  large: { value: "h-24", label: "L", pixels: "96px" },
  xlarge: { value: "h-32", label: "XL", pixels: "128px" },
} as const;

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
    <div className="relative group">
      <div
        className={cn(
          "w-full border border-dashed border-muted-foreground/30 rounded-md flex items-center justify-center transition-colors",
          "hover:border-muted-foreground/50 hover:bg-muted/30",
          SPACER_HEIGHTS[height].value,
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <MoveVertical className="h-4 w-4" />
          <span className="text-xs">
            Spacer ({SPACER_HEIGHTS[height].pixels})
          </span>
        </div>
      </div>

      {/* Height controls */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {(Object.keys(SPACER_HEIGHTS) as Array<SpacerContent["height"]>).map(
          (size) => (
            <Button
              key={size}
              variant={height === size ? "default" : "outline"}
              size="sm"
              className="h-6 w-6 p-0 text-xs"
              onClick={() => handleHeightChange(size)}
            >
              {SPACER_HEIGHTS[size].label}
            </Button>
          ),
        )}
      </div>
    </div>
  );
}
