import type { ElementRendererProps } from "@/features/elements/registry";
import { cn } from "@/lib/utils";

const SPACER_HEIGHTS = {
  small: "h-8",
  medium: "h-16",
  large: "h-24",
  xlarge: "h-32",
} as const;

export function SpacerRenderer({
  content,
}: ElementRendererProps<"block-spacer">) {
  const height = content.height || "medium";

  return (
    <div className={cn("w-full", SPACER_HEIGHTS[height])} aria-hidden="true" />
  );
}
