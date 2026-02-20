"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";

import type { ElementEditorProps } from "@/features/elements/registry";
import { useDebounceCallback } from "@baseblocks/ui/hooks/use-debounce";
import type { Block } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import { useCreateBlockNote } from "@blocknote/react";
import { useTheme } from "next-themes";
import { useCallback, useRef } from "react";
import { toast } from "sonner";

export function RichTextEditor({
  id,
  content,
  onUpdate,
  onSaveStatusChange,
}: ElementEditorProps<"richtext">) {
  const { resolvedTheme } = useTheme();
  const blockNoteTheme = resolvedTheme === "dark" ? "dark" : "light";

  const initialContentRef = useRef(content.document);

  const editor = useCreateBlockNote({
    initialContent:
      initialContentRef.current && initialContentRef.current.length > 0
        ? (initialContentRef.current as Block[])
        : undefined,
  });

  const debouncedSave = useDebounceCallback(
    useCallback(
      async (document: unknown[]) => {
        onSaveStatusChange?.("saving");
        try {
          await onUpdate({ ...content, document });
          onSaveStatusChange?.("saved");
        } catch (error) {
          console.error("Failed to save:", error);
          toast.error("Failed to save changes");
          onSaveStatusChange?.("idle");
        }
      },
      [onUpdate, content, onSaveStatusChange],
    ),
    500,
  );

  return (
    <div className="rounded-md transition-colors hover:bg-muted/50 [&_.bn-container]:!border-none [&_.bn-editor]:!pr-0 [&_.bn-editor]:!pl-12 [&_.bn-container]:!bg-transparent [&_.bn-editor]:!bg-transparent">
      <BlockNoteView
        editor={editor}
        theme={blockNoteTheme}
        onChange={() => {
          onSaveStatusChange?.("pending");
          debouncedSave(editor.document);
        }}
      />
    </div>
  );
}
