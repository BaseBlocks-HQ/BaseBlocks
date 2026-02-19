"use client";

import type { SaveStatus } from "@repo/types";
import type { AnyContent, ElementType } from "@repo/types/elements";
import { getElementEditor } from "./registry";

interface ElementEditorWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
  isSelected?: boolean;
  onUpdate: (content: AnyContent) => Promise<unknown> | void;
  onRemove?: () => Promise<unknown> | void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

/**
 * Dynamic element editor that renders the appropriate editor based on element type
 * This is the new unified wrapper for all element types
 */
export function ElementEditorWrapper({
  id,
  type,
  content,
  isSelected,
  onUpdate,
  onRemove,
  onSaveStatusChange,
}: ElementEditorWrapperProps) {
  const Editor = getElementEditor(type);

  if (!Editor) {
    return (
      <div className="p-4 border rounded text-muted-foreground">
        Element type: {type} (no editor available)
      </div>
    );
  }

  return (
    <Editor
      id={id}
      type={type}
      content={content}
      isSelected={isSelected}
      onUpdate={onUpdate}
      onRemove={onRemove}
      onSaveStatusChange={onSaveStatusChange}
    />
  );
}
