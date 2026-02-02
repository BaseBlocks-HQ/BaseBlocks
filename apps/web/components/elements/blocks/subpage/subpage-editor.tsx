"use client";

import {
  useEditorContext,
  useEditorContextOptional,
} from "@/components/editor/editor-context";
import type { ElementEditorProps } from "@/components/elements/registry";
import { ChevronRight, FileText } from "lucide-react";

export function SubpageEditor({
  id,
  content,
}: ElementEditorProps<"subpage">) {
  const editorContext = useEditorContextOptional();

  const handleClick = () => {
    if (!editorContext) return;

    const { selection, openSubpageEditor } = editorContext;
    if (!selection.layoutId || !selection.slotId) return;

    openSubpageEditor({
      blockId: id,
      layoutId: selection.layoutId,
      slotId: selection.slotId,
      content,
    });
  };

  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
      onClick={handleClick}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium truncate">
          {content.title || "Untitled sub-page"}
        </h3>
        {content.description && (
          <p className="text-sm text-muted-foreground truncate">
            {content.description}
          </p>
        )}
        {!content.title && !content.description && (
          <p className="text-sm text-muted-foreground">
            Click to edit
          </p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
    </button>
  );
}
