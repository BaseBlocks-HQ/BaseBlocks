import { cn } from "@/lib/utils";
import type { SpacerContent } from "@/types/blocks";
import type { BlockRendererBaseProps } from "../types";

const SPACER_HEIGHTS = {
  small: "h-8",
  medium: "h-16",
  large: "h-24",
  xlarge: "h-32",
} as const;

export function SpacerRenderer({ block }: BlockRendererBaseProps) {
  const content = block.content as SpacerContent;
  const height = content.height || "medium";

  return (
    <div className={cn("w-full", SPACER_HEIGHTS[height])} aria-hidden="true" />
  );
}
