"use client";

import { generateId } from "@/modules/shared/layouts";
import type { AnyContent } from "@baseblocks/types";

export interface CopiedBlock {
  type: string;
  content: AnyContent;
}

export function cloneCopiedBlock(block: CopiedBlock): CopiedBlock {
  return {
    type: block.type,
    content: structuredClone(block.content),
  };
}

export function isCopyableBlockType(type: string): boolean {
  return type !== "subpage";
}

export function canPasteCopiedBlock(
  copiedBlock: CopiedBlock | null,
): copiedBlock is CopiedBlock {
  return copiedBlock !== null && isCopyableBlockType(copiedBlock.type);
}

export function createPastedBlock(copiedBlock: CopiedBlock) {
  return {
    id: generateId(),
    type: copiedBlock.type,
    content: structuredClone(copiedBlock.content),
  };
}
