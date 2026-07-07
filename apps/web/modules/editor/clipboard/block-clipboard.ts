"use client";

import { generateId } from "@/modules/editor/layout";
import type { AnyContent } from "@baseblocks/domain";

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
  return type !== "file";
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
