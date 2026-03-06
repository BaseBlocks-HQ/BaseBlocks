"use client";

import { getElementEditor } from "@/modules/elements/framework/registry";
import type { SaveStatus } from "@baseblocks/types";
import type { AnyContent, ElementType } from "@baseblocks/types/elements";
import { createElement } from "react";

interface ElementEditorWrapperProps {
  id: string;
  type: ElementType;
  content: AnyContent;
  isSelected?: boolean;
  onUpdate: (content: AnyContent) => void;
  onRemove?: () => void;
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

  return createElement(Editor, {
    id,
    type,
    content,
    isSelected,
    onUpdate,
    onRemove,
    onSaveStatusChange,
  });
}
