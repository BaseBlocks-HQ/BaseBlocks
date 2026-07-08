"use client";

import { getElementEditor } from "@/modules/site-elements/registry";
import type { SaveStatus } from "@baseblocks/domain";
import type { AnyContent, ElementType } from "@baseblocks/domain/elements";
import { useTranslations } from "next-intl";
import { createElement } from "react";

interface ElementEditorProps {
  id: string;
  type: ElementType;
  content: AnyContent;
  isSelected?: boolean;
  onUpdate: (content: AnyContent) => void;
  onRemove?: () => void;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export function ElementEditor({
  id,
  type,
  content,
  isSelected,
  onUpdate,
  onRemove,
  onSaveStatusChange,
}: ElementEditorProps) {
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
