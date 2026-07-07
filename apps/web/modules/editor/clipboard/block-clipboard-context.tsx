"use client";

import {
  type CopiedBlock,
  cloneCopiedBlock,
} from "@/modules/editor/clipboard/block-clipboard";
import { type ReactNode, createContext, use, useState } from "react";

interface BlockClipboardContextValue {
  copiedBlock: CopiedBlock | null;
  copyBlock: (block: CopiedBlock) => void;
  clearCopiedBlock: () => void;
}

const BlockClipboardContext = createContext<BlockClipboardContextValue | null>(
  null,
);

export function BlockClipboardProvider({ children }: { children: ReactNode }) {
  const [copiedBlock, setCopiedBlock] = useState<CopiedBlock | null>(null);

  return (
    <BlockClipboardContext.Provider
      value={{
        copiedBlock,
        copyBlock: (block) => setCopiedBlock(cloneCopiedBlock(block)),
        clearCopiedBlock: () => setCopiedBlock(null),
      }}
    >
      {children}
    </BlockClipboardContext.Provider>
  );
}

export function useBlockClipboard() {
  const context = use(BlockClipboardContext);
  if (!context) {
    throw new Error(
      "useBlockClipboard must be used within a BlockClipboardProvider",
    );
  }
  return context;
}

export function useBlockClipboardOptional() {
  return use(BlockClipboardContext);
}
