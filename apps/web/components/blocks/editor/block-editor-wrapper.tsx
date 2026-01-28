"use client";

import { getBlockEditor } from "../registry";
import type { BlockEditorBaseProps, BlockData } from "../types";
import type { SaveStatus } from "@/types";

interface BlockEditorWrapperProps {
  block: BlockData;
  onUpdate: (content: unknown) => Promise<unknown> | void;
  onRemove?: () => Promise<unknown> | void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

/**
 * Dynamic block editor that renders the appropriate editor based on block type
 */
export function BlockEditorWrapper({
  block,
  onUpdate,
  onRemove,
  onSaveStatusChange,
}: BlockEditorWrapperProps) {
  const Editor = getBlockEditor(block.type);

  if (!Editor) {
    return (
      <div className="p-4 border rounded text-muted-foreground">
        Block type: {block.type} (no editor available)
      </div>
    );
  }

  return (
    <Editor
      block={block}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onSaveStatusChange={onSaveStatusChange}
    />
  );
}
