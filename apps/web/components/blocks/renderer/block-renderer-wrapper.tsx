import { getBlockRenderer } from "../registry";
import type { BlockData } from "../types";

interface BlockRendererWrapperProps {
  block: BlockData;
}

/**
 * Dynamic block renderer that renders the appropriate renderer based on block type
 */
export function BlockRendererWrapper({ block }: BlockRendererWrapperProps) {
  const Renderer = getBlockRenderer(block.type);

  if (!Renderer) {
    return null;
  }

  return <Renderer block={block} />;
}
