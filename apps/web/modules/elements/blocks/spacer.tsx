"use client";

import { cn } from "@/lib/utils";
import type { BlockSpacerContent } from "@baseblocks/types/elements";
import { DEFAULT_BLOCK_CONTENT } from "@baseblocks/types/elements";
import { Button } from "@baseblocks/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@baseblocks/ui/dropdown-menu";
import { Check, ChevronDown, MoveVertical } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type {
  ElementEditorProps,
  ElementRendererProps,
} from "../framework/registry";
import { registerElement } from "../framework/registry";
import { themedPickerImagePreview } from "../framework/themed-picker-image";

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

const SIZE_FULL_LABELS: Record<BlockSpacerContent["height"], string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "Extra Large",
};

function useContainerWidth(ref: React.RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });

    observer.observe(ref.current);
    setWidth(ref.current.offsetWidth);

    return () => observer.disconnect();
  }, [ref]);

  return width;
}

function SpacerEditor({
  content,
  onUpdate,
}: ElementEditorProps<"block-spacer">) {
  const height = content.height || "medium";
  const containerRef = useRef<HTMLDivElement>(null);
  const containerWidth = useContainerWidth(containerRef);
  const useDropdown = containerWidth > 0 && containerWidth < 200;

  const handleHeightChange = (newHeight: BlockSpacerContent["height"]) => {
    onUpdate({ height: newHeight });
  };

  return (
    <div
      ref={containerRef}
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
        {!useDropdown && (
          <span className="text-xs hidden sm:inline">Spacer</span>
        )}
      </div>

      {useDropdown ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {SIZE_LABELS[height]}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            {(
              Object.keys(SPACER_HEIGHTS) as Array<BlockSpacerContent["height"]>
            ).map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={(e) => {
                  e.stopPropagation();
                  handleHeightChange(size);
                }}
                className="gap-2"
              >
                <Check
                  className={cn(
                    "h-3 w-3",
                    height === size ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="font-medium">{SIZE_LABELS[size]}</span>
                <span className="text-muted-foreground">
                  {SIZE_FULL_LABELS[size]}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex gap-0.5 sm:gap-1">
          {(
            Object.keys(SPACER_HEIGHTS) as Array<BlockSpacerContent["height"]>
          ).map((size) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

const RENDERER_HEIGHTS = {
  small: "h-8",
  medium: "h-16",
  large: "h-24",
  xlarge: "h-32",
} as const;

function SpacerRenderer({ content }: ElementRendererProps<"block-spacer">) {
  const height = content.height || "medium";
  return (
    <div
      className={cn("w-full", RENDERER_HEIGHTS[height])}
      aria-hidden="true"
    />
  );
}

const SpacerPreview = themedPickerImagePreview(
  "/editor/picker/blocks/spacer-light.png",
  "/editor/picker/blocks/spacer-dark.png",
);

registerElement({
  type: "block-spacer",
  category: "blocks",
  label: "Spacer",
  description: "Vertical spacing between content",
  icon: MoveVertical,
  keywords: ["space", "gap", "vertical", "padding", "margin"],
  editor: SpacerEditor,
  renderer: SpacerRenderer,
  preview: SpacerPreview,
  defaultContent: DEFAULT_BLOCK_CONTENT["block-spacer"],
});
