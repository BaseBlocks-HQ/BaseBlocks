"use client";

import { getElementEditor } from "@/modules/editor/elements/framework/registry";
import type { SaveStatus } from "@baseblocks/types";
import type { AnyContent, ElementType } from "@baseblocks/types/elements";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("editor.elementWrapper");
  const Editor = getElementEditor(type);

  if (!Editor) {
    return (
      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/10 p-4 text-sm text-muted-foreground">
        {t("noEditor", { type })}
      </div>
    );
  }

  return createElement(Editor, {
    key: id,
    id,
    type,
    content,
    isSelected,
    onUpdate,
    onRemove,
    onSaveStatusChange,
  });
}
